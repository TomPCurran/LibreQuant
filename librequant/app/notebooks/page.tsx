import NotebookShellLoader from "../../components/notebook/NotebookShellLoader";

export const dynamic = "force-dynamic";

export default function NotebooksPage() {
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-10"
    >
      <section aria-labelledby="notebook-workspace-heading">
        <p
          id="notebook-workspace-heading"
          className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-brand-gray"
        >
          Workspace
        </p>
        <NotebookShellLoader />
      </section>
    </main>
  );
}
