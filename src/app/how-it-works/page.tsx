export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">How FixItPro works</h1>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">For homeowners</h2>
          <ol className="list-inside list-decimal space-y-1 text-gray-600">
            <li>Post a repair job with a description, photos, and your address.</li>
            <li>Vetted local pros send you quotes with pricing and timelines.</li>
            <li>Compare quotes, message pros with questions, and accept the one you like.</li>
            <li>Pay securely through FixItPro once the work is scheduled.</li>
            <li>Leave a review after the job is done to help other homeowners.</li>
          </ol>
        </div>
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">For repair pros</h2>
          <ol className="list-inside list-decimal space-y-1 text-gray-600">
            <li>Create a pro profile and pick the categories you service.</li>
            <li>See job leads from homeowners near you in real time.</li>
            <li>Send quotes and message customers directly on the platform.</li>
            <li>Get booked and paid securely — no chasing invoices.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
