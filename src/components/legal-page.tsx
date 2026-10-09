interface Section {
  heading: string;
  body: React.ReactNode;
}

export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: Section[];
}) {
  return (
    <div>
      <section className="bg-gray-950">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-gray-500">Last updated: {lastUpdated}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-10 text-gray-700">{intro}</div>
        <div className="flex flex-col gap-10">
          {sections.map((section, i) => (
            <div key={section.heading}>
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                {i + 1}. {section.heading}
              </h2>
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-700">{section.body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
