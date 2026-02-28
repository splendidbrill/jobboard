import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")
    const city = searchParams.get("city")
    const search = searchParams.get("search")
    const jobType = searchParams.get("jobType")
    const workMode = searchParams.get("workMode")
    const experienceLevel = searchParams.get("experienceLevel")
    const companyId = searchParams.get("companyId")
    const profession = searchParams.get("profession")
    const status = searchParams.get("status") || "OPEN"

    // Map profession values to search keywords
    const professionKeywords: Record<string, string[]> = {
      software: ["software", "developer", "engineer", "programmer", "full stack", "backend", "frontend", "web developer", "mobile developer", "devops", "sre"],
      data: ["data", "analyst", "scientist", "machine learning", "ml", "ai", "artificial intelligence", "analytics", "bi", "business intelligence"],
      design: ["design", "ux", "ui", "designer", "graphic", "product designer", "visual", "creative"],
      marketing: ["marketing", "seo", "sem", "content", "social media", "brand", "growth", "digital marketing", "campaign"],
      sales: ["sales", "account", "business development", "bd", "representative", "account executive", "sdr", "bdr"],
      finance: ["finance", "accounting", "accountant", "financial", "cfo", "controller", "bookkeeper", "treasury"],
      hr: ["hr", "human resources", "recruiter", "talent", "people", "compensation", "benefits"],
      operations: ["operations", "ops", "logistics", "supply chain", "project manager", "program manager"],
      healthcare: ["healthcare", "medical", "nurse", "doctor", "physician", "clinical", "health", "pharmaceutical"],
      engineering: ["engineer", "engineering", "mechanical", "electrical", "civil", "structural", "chemical"]
    }

    const where: any = {
      status
    }

    if (country) {
      where.country = { contains: country }
    }
    if (city) {
      where.city = { contains: city }
    }
    if (jobType) {
      where.jobType = jobType
    }
    if (workMode) {
      where.workMode = workMode
    }
    if (experienceLevel) {
      where.experienceLevel = experienceLevel
    }
    if (companyId) {
      where.companyId = companyId
    }
    
    // Build search conditions
    const searchConditions: any[] = []
    
    if (search) {
      searchConditions.push(
        { title: { contains: search } },
        { description: { contains: search } }
      )
    }
    
    // Add profession filter
    if (profession && profession !== "all_professions" && professionKeywords[profession]) {
      const keywords = professionKeywords[profession]
      const professionConditions = keywords.map(keyword => ({
        OR: [
          { title: { contains: keyword } },
          { description: { contains: keyword } },
          { skills: { contains: keyword } }
        ]
      }))
      
      if (searchConditions.length > 0) {
        where.AND = [
          { OR: searchConditions },
          { OR: professionConditions.map(c => c.OR).flat() }
        ]
      } else {
        where.OR = professionConditions.map(c => c.OR).flat()
      }
    } else if (searchConditions.length > 0) {
      where.OR = searchConditions
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        company: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePicture: true
              }
            }
          }
        },
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error("Error fetching jobs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "COMPANY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get company for this user
    const company = await prisma.company.findUnique({
      where: { userId: session.user.id }
    })

    if (!company) {
      return NextResponse.json(
        { error: "Company profile not found" },
        { status: 400 }
      )
    }

    const body = await request.json()

    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        title: body.title,
        description: body.description,
        requirements: body.requirements ? JSON.stringify(body.requirements) : null,
        responsibilities: body.responsibilities ? JSON.stringify(body.responsibilities) : null,
        country: body.country,
        city: body.city,
        workMode: body.workMode || "ONSITE",
        salaryMin: body.salaryMin,
        salaryMax: body.salaryMax,
        salaryCurrency: body.salaryCurrency || "USD",
        salaryPeriod: body.salaryPeriod || "yearly",
        jobType: body.jobType || "FULL_TIME",
        experienceLevel: body.experienceLevel,
        skills: body.skills ? JSON.stringify(body.skills) : null,
        status: body.status || "OPEN",
        applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null
      }
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error("Error creating job:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
