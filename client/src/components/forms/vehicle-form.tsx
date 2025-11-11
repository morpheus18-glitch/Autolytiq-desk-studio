import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema, type InsertVehicle } from "@shared/schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Hash, Calendar, Gauge, Loader2 } from "lucide-react";

interface VehicleFormProps {
  defaultValues?: Partial<InsertVehicle>;
  onSubmit: (data: InsertVehicle) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function VehicleForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = "Save Vehicle",
}: VehicleFormProps) {
  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      vin: defaultValues?.vin ?? "",
      year: defaultValues?.year ?? new Date().getFullYear(),
      make: defaultValues?.make ?? "",
      model: defaultValues?.model ?? "",
      trim: defaultValues?.trim ?? "",
      mileage: defaultValues?.mileage ?? 0,
      price: defaultValues?.price ?? "0",
      msrp: defaultValues?.msrp ?? "",
      invoicePrice: defaultValues?.invoicePrice ?? "",
      internetPrice: defaultValues?.internetPrice ?? "",
      condition: defaultValues?.condition ?? "new",
      status: defaultValues?.status ?? "available",
      exteriorColor: defaultValues?.exteriorColor ?? "",
      interiorColor: defaultValues?.interiorColor ?? "",
      engineType: defaultValues?.engineType ?? "",
      transmission: defaultValues?.transmission ?? "",
      drivetrain: defaultValues?.drivetrain ?? "",
      fuelType: defaultValues?.fuelType ?? "",
      mpgCity: defaultValues?.mpgCity ?? undefined,
      mpgHighway: defaultValues?.mpgHighway ?? undefined,
      images: defaultValues?.images ?? [],
      features: defaultValues?.features ?? [],
      isNew: defaultValues?.isNew ?? false,
    },
  });

  const handleSubmit = async (data: InsertVehicle) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        {...field}
                        placeholder="1HGBH41JXMN109186"
                        className="pl-9 font-mono"
                        data-testid="input-vehicle-vin"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>17-character vehicle identification number</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        {...field}
                        type="number"
                        placeholder="2024"
                        className="pl-9"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-vehicle-year"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Honda" data-testid="input-vehicle-make" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Civic" data-testid="input-vehicle-model" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trim (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="EX" data-testid="input-vehicle-trim" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mileage</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        {...field}
                        type="number"
                        placeholder="10000"
                        className="pl-9"
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-vehicle-mileage"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        {...field}
                        type="number"
                        placeholder="28500"
                        className="pl-9 font-mono"
                        data-testid="input-vehicle-price"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Customer-facing selling price</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoicePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dealer Cost (Invoice Price)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" />
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="number"
                        placeholder="24500"
                        className="pl-9 font-mono"
                        data-testid="input-vehicle-invoice-price"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Internal dealer cost (for profit calculation)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="msrp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MSRP (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="number"
                        placeholder="30000"
                        className="pl-9 font-mono"
                        data-testid="input-vehicle-msrp"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internetPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internet Price (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="number"
                        placeholder="27995"
                        className="pl-9 font-mono"
                        data-testid="input-vehicle-internet-price"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>Online advertised price</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Status Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Status & Condition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle-condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="certified">Certified Pre-Owned</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-vehicle-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Colors & Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Colors & Specifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="exteriorColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exterior Color (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Sonic Gray Pearl" data-testid="input-vehicle-exterior-color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interiorColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interior Color (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Black Cloth" data-testid="input-vehicle-interior-color" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="engineType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engine (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="2.0L 4-Cylinder Turbo" data-testid="input-vehicle-engine-type" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transmission (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Automatic" data-testid="input-vehicle-transmission" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="drivetrain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drivetrain (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="FWD" data-testid="input-vehicle-drivetrain" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Gasoline" data-testid="input-vehicle-fuel-type" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit-vehicle">
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
