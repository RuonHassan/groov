import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = [
  { value: "#B7B1F2", label: "Purple" },
  { value: "#FDB7EA", label: "Pink" },
  { value: "#FFDCCC", label: "Peach" },
  { value: "#FBF3B9", label: "Yellow" },
  { value: "#B1C29E", label: "Sage" },
  { value: "#F0A04B", label: "Orange" },
];

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full h-[44px] p-0 overflow-hidden border-0 bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 [&>span]:hidden [&>svg]:hidden">
        <div className="w-full h-full rounded-md" style={{ backgroundColor: value }} />
      </SelectTrigger>
      <SelectContent
        side="bottom"
        align="center"
        alignOffset={0}
        className="p-2 w-[360px] border rounded-xl shadow-lg"
      >
        <div className="flex gap-3.5">
          {COLORS.map((color) => (
            <SelectItem
              key={color.value}
              value={color.value}
              className="p-0 m-0 w-[44px] h-[32px] rounded-md cursor-pointer relative data-[highlighted]:bg-transparent focus:bg-transparent hover:bg-transparent data-[state=checked]:bg-transparent [&>span]:hidden"
              style={{ backgroundColor: color.value }}
            >
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  );
} 