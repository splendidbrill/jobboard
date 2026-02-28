import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    const job = await prisma.job.findUnique({
      where: { id },
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
        },
        _count: {
          select: { applications: true }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Check if user has applied (if logged in as job seeker)
    let hasApplied = false
    if (session && session.user.role === "JOB_SEEKER") {
      const application = await prisma.application.findUnique({
        where: {
          jobId_userId: {
            jobId: id,
            userId: session.user.id
          }
        }
      })
      hasApplied = !!application
    }

    return NextResponse.json({ ...job, hasApplied })
  } catch (error) {
    console.error("Error fetching job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session || session.user.role !== "COMPANY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true }
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Check if user owns this job
    if (job.company.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        requirements: body.requirements ? JSON.stringify(body.requirements) : undefined,
        responsibilities: body.responsibilities ? JSON.stringify(body.responsibilities) : undefined,
        country: body.country,
        city: body.city,
        workMode: body.workMode,
        salaryMin: body.salaryMin,
        salaryMax: body.salaryMax,
        salaryCurrency: body.salaryCurrency,
        salaryPeriod: body.salaryPeriod,
        jobType: body.jobType,
        experienceLevel: body.experienceLevel,
        skills: body.skills ? JSON.stringify(body.skills) : undefined,
        status: body.status,
        applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : undefined
      }
    })

    return NextResponse.json(updatedJob)
  } catch (error) {
    console.error("Error updating job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true }
    })

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    // Check if user owns this job or is super admin
    if (job.company.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.job.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
