import { Briefcase, Users, Target, Globe, Award, Shield, ArrowRight } from "lucide-react"
import NextLink from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header / Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NextLink href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
                JobConnect
              </span>
            </NextLink>
            <NextLink href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Back to Home <ArrowRight className="w-4 h-4" />
            </NextLink>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-600 to-indigo-800 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Connecting Talent with Opportunity</h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8">
            We believe that finding the right job or the right candidate shouldn't be a struggle. 
            JobConnect is designed to make global hiring seamless, transparent, and efficient.
          </p>
        </div>
      </section>

      {/* Our Mission & Vision */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-slate-600 leading-relaxed">
                To empower professionals to build their dream careers and enable companies to discover world-class talent. We simplify the recruitment lifecycle through advanced matching, streamlined communication, and a user-first experience.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-slate-600 leading-relaxed">
                A world where geographic borders and outdated hiring processes no longer stand in the way of human potential. We aim to become the leading platform for seamless, boundary-less career growth globally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-12">Why Choose JobConnect?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Community First</h3>
              <p className="text-slate-500">
                We prioritize user experience, ensuring that job seekers and employers can navigate our platform effortlessly.
              </p>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Trust & Transparency</h3>
              <p className="text-slate-500">
                No hidden fees or fake listings. We heavily vet companies to ensure every job posted on our platform is legitimate.
              </p>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quality Matches</h3>
              <p className="text-slate-500">
                Our smart algorithms help highlight candidates whose skills and experiences genuinely align with open opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Simplified for About Page) */}
      <footer className="bg-slate-900 text-white py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <p>© {new Date().getFullYear()} JobConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
