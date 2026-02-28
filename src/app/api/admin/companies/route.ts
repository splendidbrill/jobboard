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

    const { searchParams } = new URL(request.url)
    const country = searchParams.get("country")
    const city = searchParams.get("city")
    const search = searchParams.get("search")

    const where: any = {}

    if (country) {
      where.country = country
    }
    if (city) {
      where.city = city
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
            createdAt: true
          }
        },
        _count: {
          select: { jobs: true }
        }
      },
      orderBy: [
        { country: "asc" },
        { city: "asc" },
        { companyName: "asc" }
      ]
    })

    // Group by country and city for easy display
    const groupedByCountry = companies.reduce((acc: any, company) => {
      const countryName = company.country || "Unknown"
      const cityName = company.city || "Unknown"
      
      if (!acc[countryName]) {
        acc[countryName] = {}
      }
      if (!acc[countryName][cityName]) {
        acc[countryName][cityName] = []
      }
      acc[countryName][cityName].push(company)
      
      return acc
    }, {})

    // Get unique countries and cities for filters
    const countries = await prisma.company.findMany({
      where: { country: { not: null } },
      select: { country: true, city: true },
      distinct: ["country"]
    })

    const countryCityMap: Record<string, string[]> = {}
    for (const c of countries) {
      if (c.country) {
        if (!countryCityMap[c.country]) {
          countryCityMap[c.country] = []
        }
        if (c.city && !countryCityMap[c.country].includes(c.city)) {
          countryCityMap[c.country].push(c.city)
        }
      }
    }

    return NextResponse.json({
      companies,
      groupedByCountry,
      countryCityMap
    })
  } catch (error) {
    console.error("Error fetching admin companies:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
