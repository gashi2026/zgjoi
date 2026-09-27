import Categories from "@/components/Categories";
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <div>
      <h1 className="sr-only">Kategoritë e shërbimeve</h1>
      <Categories />
    </div>
  );
}
