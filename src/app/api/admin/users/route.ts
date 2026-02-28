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
    const role = searchParams.get("role")

    const where: any = {}

    if (country) {
      where.country = country
    }
    if (city) {
      where.city = city
    }
    if (role) {
      where.role = role
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            companyName: true
          }
        },
        _count: {
          select: { applications: true }
        }
      },
      orderBy: [
        { country: "asc" },
        { city: "asc" },
        { name: "asc" }
      ]
    })

    // Group by country and city for easy display
    const groupedByCountry = users.reduce((acc: any, user) => {
      const countryName = user.country || "Unknown"
      const cityName = user.city || "Unknown"
      
      if (!acc[countryName]) {
        acc[countryName] = {}
      }
      if (!acc[countryName][cityName]) {
        acc[countryName][cityName] = []
      }
      acc[countryName][cityName].push(user)
      
      return acc
    }, {})

    // Get unique countries and cities for filters
    const countries = await prisma.user.findMany({
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
      users,
      groupedByCountry,
      countryCityMap
    })
  } catch (error) {
    console.error("Error fetching admin users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Prevent deleting super admin
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete super admin" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
