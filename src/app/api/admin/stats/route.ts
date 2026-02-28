import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get counts
    const totalUsers = await prisma.user.count({
      where: { role: "JOB_SEEKER" }
    })
    const totalCompanies = await prisma.company.count()
    const totalJobs = await prisma.job.count()
    const totalApplications = await prisma.application.count()
    const openJobs = await prisma.job.count({
      where: { status: "OPEN" }
    })

    // Get recent activity
    const recentJobs = await prisma.job.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            companyName: true
          }
        }
      }
    })

    const recentApplications = await prisma.application.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        job: {
          select: {
            title: true
          }
        }
      }
    })

    // Get stats by country
    const usersByCountry = await prisma.user.groupBy({
      by: ["country"],
      where: {
        country: { not: null },
        role: "JOB_SEEKER"
      },
      _count: true
    })

    const companiesByCountry = await prisma.company.groupBy({
      by: ["country"],
      where: {
        country: { not: null }
      },
      _count: true
    })

    return NextResponse.json({
      stats: {
        totalUsers,
        totalCompanies,
        totalJobs,
        totalApplications,
        openJobs
      },
      recentJobs,
      recentApplications,
      usersByCountry,
      companiesByCountry
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
