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
    const industry = searchParams.get("industry")

    const where: any = {}

    if (country) {
      where.country = country
    }
    if (city) {
      where.city = city
    }
    if (industry) {
      where.industry = industry
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profilePicture: true
          }
        },
        jobs: {
          where: { status: "OPEN" },
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: { jobs: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error("Error fetching companies:", error)
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

    const body = await request.json()

    // Check if company already exists for this user
    const existingCompany = await prisma.company.findUnique({
      where: { userId: session.user.id }
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: "Company profile already exists" },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
      data: {
        userId: session.user.id,
        companyName: body.companyName,
        description: body.description,
        website: body.website,
        logo: body.logo,
        industry: body.industry,
        companySize: body.companySize,
        foundedYear: body.foundedYear,
        country: body.country,
        city: body.city,
        address: body.address
      }
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error("Error creating company:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
