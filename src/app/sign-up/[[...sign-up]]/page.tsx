import { SignUp } from '@clerk/nextjs'
export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4">
      <SignUp appearance={{ elements: { formButtonPrimary: 'bg-[#2d7a4f] hover:bg-[#1f5537]' } }} />
    </div>
  )
}
