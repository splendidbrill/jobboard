import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create super admin
  const hashedPassword = await bcrypt.hash("admin123", 10)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@jobboard.com" },
    update: {},
    create: {
      email: "admin@jobboard.com",
      password: hashedPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      country: "USA",
      city: "New York"
    }
  })

  console.log("Created super admin:", superAdmin.email)

  // Create sample companies
  const companies = [
    {
      companyName: "TechCorp Inc.",
      description: "Leading technology company specializing in AI and machine learning solutions.",
      website: "https://techcorp.com",
      industry: "Technology",
      companySize: "201-500",
      foundedYear: 2010,
      country: "USA",
      city: "San Francisco"
    },
    {
      companyName: "Global Finance",
      description: "International financial services company providing banking and investment solutions.",
      website: "https://globalfinance.com",
      industry: "Finance",
      companySize: "500+",
      foundedYear: 1995,
      country: "USA",
      city: "New York"
    },
    {
      companyName: "HealthCare Plus",
      description: "Healthcare technology company focused on improving patient outcomes.",
      website: "https://healthcareplus.com",
      industry: "Healthcare",
      companySize: "51-200",
      foundedYear: 2015,
      country: "UK",
      city: "London"
    },
    {
      companyName: "Digital Solutions",
      description: "Digital transformation agency helping businesses modernize their operations.",
      website: "https://digitalsolutions.com",
      industry: "Technology",
      companySize: "11-50",
      foundedYear: 2018,
      country: "Canada",
      city: "Toronto"
    },
    {
      companyName: "EcoEnergy",
      description: "Renewable energy company focused on sustainable power solutions.",
      website: "https://ecoenergy.com",
      industry: "Energy",
      companySize: "201-500",
      foundedYear: 2012,
      country: "Germany",
      city: "Berlin"
    }
  ]

  for (const companyData of companies) {
    const hashedPass = await bcrypt.hash("company123", 10)
    const email = companyData.companyName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + "@example.com"
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: hashedPass,
        name: companyData.companyName,
        role: "COMPANY",
        country: companyData.country,
        city: companyData.city
      }
    })

    const company = await prisma.company.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        ...companyData
      }
    })

    console.log("Created company:", company.companyName)
  }

  // Create sample job seekers
  const jobSeekers = [
    {
      name: "John Smith",
      email: "john.smith@example.com",
      country: "USA",
      city: "New York",
      skills: ["JavaScript", "React", "Node.js", "TypeScript"],
      experience: "5 years",
      headline: "Full Stack Developer"
    },
    {
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      country: "USA",
      city: "San Francisco",
      skills: ["Python", "Machine Learning", "Data Science", "SQL"],
      experience: "3 years",
      headline: "Data Scientist"
    },
    {
      name: "Michael Brown",
      email: "michael.b@example.com",
      country: "UK",
      city: "London",
      skills: ["Java", "Spring Boot", "Microservices", "AWS"],
      experience: "7 years",
      headline: "Senior Backend Developer"
    },
    {
      name: "Emily Chen",
      email: "emily.chen@example.com",
      country: "Canada",
      city: "Toronto",
      skills: ["UI/UX Design", "Figma", "Adobe XD", "HTML/CSS"],
      experience: "4 years",
      headline: "UI/UX Designer"
    },
    {
      name: "David Wilson",
      email: "david.w@example.com",
      country: "Germany",
      city: "Berlin",
      skills: ["DevOps", "Kubernetes", "Docker", "CI/CD"],
      experience: "6 years",
      headline: "DevOps Engineer"
    }
  ]

  for (const seekerData of jobSeekers) {
    const hashedPass = await bcrypt.hash("user123", 10)
    
    const user = await prisma.user.upsert({
      where: { email: seekerData.email },
      update: {},
      create: {
        email: seekerData.email,
        password: hashedPass,
        name: seekerData.name,
        role: "JOB_SEEKER",
        country: seekerData.country,
        city: seekerData.city,
        skills: JSON.stringify(seekerData.skills),
        experience: seekerData.experience,
        headline: seekerData.headline
      }
    })

    console.log("Created job seeker:", user.name)
  }

  // Create sample jobs
  const allCompanies = await prisma.company.findMany()
  
  const sampleJobs = [
    {
      title: "Senior Frontend Developer",
      description: "We are looking for an experienced Frontend Developer to join our team. You will be responsible for building and maintaining user interfaces for our web applications.",
      requirements: ["5+ years experience with React", "Strong TypeScript skills", "Experience with state management", "Good communication skills"],
      responsibilities: ["Develop new user-facing features", "Optimize applications for maximum speed", "Collaborate with backend developers", "Write clean, maintainable code"],
      country: "USA",
      city: "San Francisco",
      workMode: "HYBRID",
      salaryMin: 120000,
      salaryMax: 180000,
      jobType: "FULL_TIME",
      experienceLevel: "Senior",
      skills: ["React", "TypeScript", "JavaScript", "CSS"]
    },
    {
      title: "Data Scientist",
      description: "Join our data science team to build machine learning models and derive insights from large datasets.",
      requirements: ["3+ years in data science", "Strong Python skills", "Experience with ML frameworks", "Statistical analysis background"],
      responsibilities: ["Build and deploy ML models", "Analyze large datasets", "Present findings to stakeholders", "Collaborate with product teams"],
      country: "USA",
      city: "San Francisco",
      workMode: "REMOTE",
      salaryMin: 130000,
      salaryMax: 200000,
      jobType: "FULL_TIME",
      experienceLevel: "Mid",
      skills: ["Python", "TensorFlow", "SQL", "Statistics"]
    },
    {
      title: "Product Manager",
      description: "Lead product strategy and work with cross-functional teams to deliver amazing products.",
      requirements: ["4+ years product management", "Technical background preferred", "Excellent communication", "Agile methodology experience"],
      responsibilities: ["Define product roadmap", "Work with engineering teams", "Gather customer feedback", "Prioritize features"],
      country: "USA",
      city: "New York",
      workMode: "ONSITE",
      salaryMin: 140000,
      salaryMax: 200000,
      jobType: "FULL_TIME",
      experienceLevel: "Senior",
      skills: ["Product Strategy", "Agile", "Analytics", "Communication"]
    },
    {
      title: "DevOps Engineer",
      description: "Build and maintain our cloud infrastructure and CI/CD pipelines.",
      requirements: ["5+ years DevOps experience", "Strong AWS knowledge", "Kubernetes expertise", "Scripting skills"],
      responsibilities: ["Manage cloud infrastructure", "Implement CI/CD pipelines", "Monitor system performance", "Automate deployments"],
      country: "Germany",
      city: "Berlin",
      workMode: "REMOTE",
      salaryMin: 80000,
      salaryMax: 120000,
      jobType: "FULL_TIME",
      experienceLevel: "Senior",
      skills: ["AWS", "Kubernetes", "Docker", "Terraform"]
    },
    {
      title: "UI/UX Designer",
      description: "Create beautiful and intuitive user interfaces for our digital products.",
      requirements: ["3+ years design experience", "Strong Figma skills", "Portfolio required", "User research experience"],
      responsibilities: ["Design user interfaces", "Conduct user research", "Create prototypes", "Collaborate with developers"],
      country: "Canada",
      city: "Toronto",
      workMode: "HYBRID",
      salaryMin: 70000,
      salaryMax: 100000,
      jobType: "FULL_TIME",
      experienceLevel: "Mid",
      skills: ["Figma", "Adobe XD", "UI Design", "User Research"]
    },
    {
      title: "Backend Developer",
      description: "Build scalable backend services and APIs for our financial platform.",
      requirements: ["4+ years backend development", "Java/Spring Boot experience", "Database design skills", "API development experience"],
      responsibilities: ["Develop backend services", "Design database schemas", "Write unit tests", "Code review"],
      country: "UK",
      city: "London",
      workMode: "HYBRID",
      salaryMin: 60000,
      salaryMax: 90000,
      jobType: "FULL_TIME",
      experienceLevel: "Mid",
      skills: ["Java", "Spring Boot", "PostgreSQL", "REST APIs"]
    },
    {
      title: "Software Engineering Intern",
      description: "Great opportunity for students to gain real-world software development experience.",
      requirements: ["Currently pursuing CS degree", "Basic programming skills", "Eager to learn", "Good communication"],
      responsibilities: ["Assist in development tasks", "Write documentation", "Participate in code reviews", "Learn new technologies"],
      country: "USA",
      city: "San Francisco",
      workMode: "ONSITE",
      salaryMin: 5000,
      salaryMax: 8000,
      salaryPeriod: "monthly",
      jobType: "INTERNSHIP",
      experienceLevel: "Entry",
      skills: ["Programming", "Problem Solving", "Communication"]
    },
    {
      title: "Marketing Manager",
      description: "Lead marketing initiatives and grow our brand presence in the market.",
      requirements: ["5+ years marketing experience", "Digital marketing expertise", "Team management skills", "Data-driven approach"],
      responsibilities: ["Develop marketing strategy", "Manage marketing budget", "Lead marketing team", "Analyze campaign performance"],
      country: "USA",
      city: "New York",
      workMode: "HYBRID",
      salaryMin: 90000,
      salaryMax: 130000,
      jobType: "FULL_TIME",
      experienceLevel: "Senior",
      skills: ["Digital Marketing", "SEO", "Content Strategy", "Analytics"]
    }
  ]

  for (let i = 0; i < sampleJobs.length; i++) {
    const jobData = sampleJobs[i]
    const company = allCompanies[i % allCompanies.length]
    
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        title: jobData.title,
        description: jobData.description,
        requirements: JSON.stringify(jobData.requirements),
        responsibilities: JSON.stringify(jobData.responsibilities),
        country: jobData.country,
        city: jobData.city,
        workMode: jobData.workMode as any,
        salaryMin: jobData.salaryMin,
        salaryMax: jobData.salaryMax,
        salaryPeriod: jobData.salaryPeriod || "yearly",
        jobType: jobData.jobType as any,
        experienceLevel: jobData.experienceLevel,
        skills: JSON.stringify(jobData.skills),
        status: "OPEN"
      }
    })

    console.log("Created job:", job.title)
  }

  console.log("\n=== Seeding completed ===")
  console.log("Super Admin Login: admin@jobboard.com / admin123")
  console.log("Company Login: techcorpinc@example.com / company123")
  console.log("Job Seeker Login: john.smith@example.com / user123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
