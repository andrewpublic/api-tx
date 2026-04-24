import RegisterForm from "./components/RegisterForm.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">api-tx</h1>
          <p className="mt-2 text-zinc-400 text-sm">
            Connect your Up Bank account to auto-track spending.
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
