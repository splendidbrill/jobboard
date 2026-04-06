"use client"

import { useAuth } from "@/lib/auth-context"
import { Building2, User, Briefcase, Mail } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

export default function OnboardingPage() {
  const { session, requireRoleSelection, requireEmailConfirmation, completeOnboarding, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If they already have a role, send them back to the main app homepage
    if (!requireRoleSelection && !requireEmailConfirmation) {
      router.push("/")
    }
  }, [requireRoleSelection, requireEmailConfirmation, router])

  const handleCancel = async () => {
    await signOut()
    router.push("/")
  }

  if (!requireRoleSelection && !requireEmailConfirmation) return null;

  // Show email confirmation message if needed
  if (requireEmailConfirmation) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold mb-3">Check Your Email</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            We've sent you a confirmation email. Please click the link in the email to verify your account before continuing.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={async () => {
                  const { data, error } = await supabase.auth.resend({
                    type: 'signup',
                    email: session?.user?.email || ''
                  })
                  if (error) {
                    toast.error('Failed to resend email')
                  } else {
                    toast.success('Confirmation email sent!')
                  }
                }}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                click here to resend
              </button>
            </p>
            <Button onClick={() => signOut()} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold mb-3">Welcome to JobConnect!</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          Before we let you in, please tell us how you plan to use JobConnect.
        </p>
        
        <div className="grid md:grid-cols-2 gap-4">
          <button 
            onClick={async () => {
              toast.loading("Setting up your account...", { id: "onboarding" });
              const { error } = await completeOnboarding("JOB_SEEKER");
              if (error) {
                toast.error(`Failed: ${error.message || error}`, { id: "onboarding" });
              } else {
                toast.success("Welcome aboard!", { id: "onboarding" });
                router.push("/");
              }
            }}
            className="group p-6 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left"
          >
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">I am looking for a job</h3>
            <p className="text-slate-500 text-sm">Find roles, apply for jobs, and connect with employers.</p>
          </button>
          
          <button 
            onClick={async () => {
              toast.loading("Setting up your account...", { id: "onboarding" });
              const { error } = await completeOnboarding("COMPANY");
              if (error) {
                toast.error(`Failed: ${error.message || error}`, { id: "onboarding" });
              } else {
                toast.success("Welcome aboard!", { id: "onboarding" });
                router.push("/");
              }
            }}
            className="group p-6 rounded-xl border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-left"
          >
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">I am hiring</h3>
            <p className="text-slate-500 text-sm">Post jobs, review applications, and hire talent.</p>
          </button>
        </div>
        
        <div className="mt-8 text-center">
          <button onClick={handleCancel} className="text-slate-500 hover:text-red-500 text-sm font-medium transition-colors">
            Cancel & Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
