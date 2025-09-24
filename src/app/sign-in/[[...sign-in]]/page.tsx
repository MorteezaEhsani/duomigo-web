import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignIn
        appearance={{
          elements: {
            // Hide Clerk branding
            logoBox: "hidden",
            footer: "hidden",

            // Card styling
            card: "shadow-xl border-0 bg-white",
            rootBox: "w-full",

            // Header styling
            headerTitle: "text-2xl font-bold text-gray-900",
            headerSubtitle: "text-gray-600 mt-2",

            // Form styling
            formButtonPrimary:
              "bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium normal-case shadow-sm transition-colors",
            formFieldLabel: "text-gray-700 font-medium text-sm",
            formFieldInput: "border-gray-300 focus:border-amber-500 focus:ring-amber-500",
            formFieldInputShowPasswordButton: "text-gray-500 hover:text-gray-700",

            // Social buttons
            socialButtonsBlockButton:
              "border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 font-medium",
            socialButtonsBlockButtonText: "font-medium",

            // Links
            footerActionLink: "text-amber-600 hover:text-amber-700 font-medium",
            identityPreviewEditButtonIcon: "text-amber-600",

            // Divider
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-500",

            // Other elements
            alert: "text-red-600 bg-red-50 border-red-200",
            alertText: "text-red-700",
            formHeaderTitle: "text-xl font-bold text-gray-900",
            formHeaderSubtitle: "text-gray-600",
            otpCodeFieldInput: "border-gray-300 focus:border-amber-500 focus:ring-amber-500",
            formResendCodeLink: "text-amber-600 hover:text-amber-700"
          },
          layout: {
            logoPlacement: "none",
            showOptionalFields: true
          },
          variables: {
            colorPrimary: "#f59e0b",
            colorText: "#111827",
            colorTextOnPrimaryBackground: "#ffffff",
            colorBackground: "#ffffff",
            colorInputBackground: "#ffffff",
            colorInputText: "#111827",
            borderRadius: "0.5rem"
          }
        }}
      />
    </div>
  );
}