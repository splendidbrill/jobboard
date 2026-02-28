import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const application = await prisma.application.findUnique({
      where: { id },
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
      }
    })

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Check access rights
    const isOwner = application.userId === session.user.id
    const isCompanyOwner = session.user.role === "COMPANY" && 
      application.job.company.userId === session.user.id
    const isSuperAdmin = session.user.role === "SUPER_ADMIN"

    if (!isOwner && !isCompanyOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error("Error fetching application:", error)
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
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: { company: true }
        }
      }
    })

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const body = await request.json()

    // Job seeker can withdraw application
    if (session.user.role === "JOB_SEEKER" && application.userId === session.user.id) {
      if (body.status === "WITHDRAWN") {
        const updatedApplication = await prisma.application.update({
          where: { id },
          data: { status: "WITHDRAWN" }
        })
        return NextResponse.json(updatedApplication)
      }
    }

    // Company can update status
    if (session.user.role === "COMPANY" && application.job.company.userId === session.user.id) {
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: { status: body.status }
      })

      // Create notification for user
      await prisma.notification.create({
        data: {
          companyId: application.job.companyId,
          userId: application.userId,
          title: "Application Status Updated",
          message: `Your application for "${application.job.title}" has been updated to ${body.status}`,
          type: "STATUS_UPDATE",
          relatedId: application.id
        }
      })

      return NextResponse.json(updatedApplication)
    }

    // Super admin can update anything
    if (session.user.role === "SUPER_ADMIN") {
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: { status: body.status }
      })
      return NextResponse.json(updatedApplication)
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("Error updating application:", error)
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

    const application = await prisma.application.findUnique({
      where: { id }
    })

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Only job seeker (owner) or super admin can delete
    if (application.userId !== session.user.id && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.application.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting application:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
