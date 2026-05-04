import { SignIn } from '@clerk/nextjs'
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
      <SignIn appearance={{ elements: { formButtonPrimary: 'bg-[#2d7a4f] hover:bg-[#1f5537]' } }} />
    </div>
  )
}
