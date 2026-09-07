import { activeCategories } from "@/lib/server/catalog";
import CategoryGrid from "./CategoryGrid";
export default async function Categories() {
  return <CategoryGrid categories={await activeCategories()} />;
}
