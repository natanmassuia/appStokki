import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";

interface CategoryQuickAssignProps {
  currentCategoryName?: string;
  currentCategoryId?: string | null;
  productId: string;
}

export function CategoryQuickAssign({
  currentCategoryName,
  currentCategoryId,
  productId,
}: CategoryQuickAssignProps) {
  const [open, setOpen] = useState(false);
  const { categories, createCategory } = useCategories();
  const { updateProduct } = useProducts();
  const [searchValue, setSearchValue] = useState("");

  const handleSelectCategory = async (categoryId: string) => {
    await updateProduct.mutateAsync({
      id: productId,
      category_id: categoryId,
    });
    setOpen(false);
  };

  const handleCreateCategory = async () => {
    if (!searchValue.trim()) return;
    try {
      const newCategory = await createCategory.mutateAsync(searchValue.trim());
      if (newCategory) {
        await handleSelectCategory(newCategory.id);
      }
    } catch (error) {
      console.error("Failed to create category", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 text-xs font-normal transition-colors",
             currentCategoryId 
               ? "justify-start px-2 w-full hover:bg-primary hover:text-primary-foreground" 
               : "justify-center w-8 px-0 border-dashed border border-muted-foreground/30 text-muted-foreground hover:bg-primary hover:text-primary-foreground"
          )}
        >
          {currentCategoryName ? (
            <span className="truncate text-left">{currentCategoryName}</span>
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar categoria..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-center text-xs">
              <p className="text-muted-foreground mb-2">Nenhuma categoria encontrada.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-7 text-xs"
                onClick={handleCreateCategory}
                disabled={!searchValue.trim()}
              >
                <Plus className="mr-1 h-3 w-3" />
                Criar "{searchValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelectCategory(category.id)}
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground aria-selected:bg-primary aria-selected:text-primary-foreground data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentCategoryId === category.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
