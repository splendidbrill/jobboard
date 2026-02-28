import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")
    const userId = searchParams.get("userId")

    let where: any = {}

    // Job seekers can only see their own applications
    if (session.user.role === "JOB_SEEKER") {
      where.userId = session.user.id
    } else if (session.user.role === "COMPANY") {
      // Companies can see applications for their jobs
      const company = await prisma.company.findUnique({
        where: { userId: session.user.id }
      })
      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 })
      }
      
      if (jobId) {
        // Verify job belongs to this company
        const job = await prisma.job.findFirst({
          where: { id: jobId, companyId: company.id }
        })
        if (!job) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 })
        }
        where.jobId = jobId
      } else {
        // Get all applications for company's jobs
        const jobs = await prisma.job.findMany({
          where: { companyId: company.id },
          select: { id: true }
        })
        where.jobId = { in: jobs.map(j => j.id) }
      }
    } else if (session.user.role === "SUPER_ADMIN") {
      // Super admin can see all applications
      if (jobId) where.jobId = jobId
      if (userId) where.userId = userId
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            company: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePicture: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            headline: true,
            skills: true,
            experience: true,
            education: true,
            resume: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JOB_SEEKER") {
      return NextResponse.json({ error: "Only job seekers can apply" }, { status: 401 })
    }

    const body = await request.json()

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_userId: {
          jobId: body.jobId,
          userId: session.user.id
        }
      }
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already applied to this job" },
        { status: 400 }
      )
    }

    // Get job and company info
    const job = await prisma.job.findUnique({
      where: { id: body.jobId },
      include: { company: true }
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        jobId: body.jobId,
        userId: session.user.id,
        coverLetter: body.coverLetter,
        resume: body.resume
      }
    })

    // Create notification for company
    await prisma.notification.create({
      data: {
        companyId: job.companyId,
        userId: session.user.id,
        title: "New Job Application",
        message: `A new candidate has applied for "${job.title}"`,
        type: "APPLICATION",
        relatedId: application.id
      }
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("Error creating application:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
