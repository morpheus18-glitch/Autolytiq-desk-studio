import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Hash, Calendar, Gauge, Loader2, Scan, CheckCircle, AlertCircle } from "lucide-react";
import { VINDecoder } from "@/lib/vin-decoder";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeStatus, setDecodeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
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
      mpgCity: defaultValues?.mpgCity ?? null,
      mpgHighway: defaultValues?.mpgHighway ?? null,
      images: defaultValues?.images ?? [],
      features: defaultValues?.features ?? [],
      isNew: defaultValues?.isNew ?? false,
    },
  });

  const handleVINDecode = async () => {
    const vin = form.getValues("vin");
    
    if (!vin || vin.length !== 17) {
      toast({
        title: "Invalid VIN",
        description: "VIN must be exactly 17 characters",
        variant: "destructive",
      });
      return;
    }

    setIsDecoding(true);
    setDecodeStatus('idle');

    try {
      const decoded = await VINDecoder.decode(vin);
      
      // Auto-fill form fields from decoded data
      if (decoded.year) form.setValue("year", decoded.year);
      if (decoded.make) form.setValue("make", decoded.make);
      if (decoded.model) form.setValue("model", decoded.model);
      if (decoded.trim) form.setValue("trim", decoded.trim);
      if (decoded.transmission) form.setValue("transmission", decoded.transmission);
      if (decoded.drivetrain) form.setValue("drivetrain", decoded.drivetrain);
      if (decoded.fuelType) form.setValue("fuelType", decoded.fuelType);
      
      // Build engine description from decoded data
      if (decoded.engineDisplacement || decoded.engineCylinders) {
        const engineParts = [];
        if (decoded.engineDisplacement) engineParts.push(`${decoded.engineDisplacement}L`);
        if (decoded.engineCylinders) {
          const cylinderConfig = decoded.engineCylinders <= 4 ? 'I' : 'V';
          engineParts.push(`${cylinderConfig}${decoded.engineCylinders}`);
        }
        if (decoded.fuelType) engineParts.push(decoded.fuelType);
        form.setValue("engineType", engineParts.join(' '));
      }

      setDecodeStatus('success');
      toast({
        title: "VIN Decoded Successfully",
        description: `${decoded.year} ${decoded.make} ${decoded.model}`,
      });
    } catch (error: any) {
      setDecodeStatus('error');
      toast({
        title: "VIN Decode Failed",
        description: error.message || "Could not decode VIN. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsDecoding(false);
    }
  };

  const handleSubmit = async (data: InsertVehicle) => {
    try {
      await onSubmit(data);
      form.reset();
      setDecodeStatus('idle'); // Reset decode status after successful submission
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
          
          {/* VIN Decode Status */}
          {decodeStatus === 'success' && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                VIN decoded successfully! Vehicle details have been auto-filled.
              </AlertDescription>
            </Alert>
          )}
          {decodeStatus === 'error' && (
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                Could not decode VIN. Please enter vehicle details manually.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          {...field}
                          placeholder="1HGBH41JXMN109186"
                          className="pl-9 font-mono uppercase"
                          maxLength={17}
                          onChange={(e) => {
                            field.onChange(e.target.value.toUpperCase());
                            setDecodeStatus('idle');
                          }}
                          data-testid="input-vehicle-vin"
                        />
                      </div>
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleVINDecode}
                      disabled={isDecoding || field.value.length !== 17}
                      className="gap-2"
                      data-testid="button-decode-vin"
                    >
                      {isDecoding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Decoding...
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          Decode VIN
                        </>
                      )}
                    </Button>
                  </div>
                  <FormDescription>17-character vehicle identification number - Click "Decode VIN" to auto-fill details</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
                    <Input {...field} value={field.value ?? ""} placeholder="EX" data-testid="input-vehicle-trim" />
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
                    <Input {...field} value={field.value ?? ""} placeholder="Sonic Gray Pearl" data-testid="input-vehicle-exterior-color" />
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
                    <Input {...field} value={field.value ?? ""} placeholder="Black Cloth" data-testid="input-vehicle-interior-color" />
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
                    <Input {...field} value={field.value ?? ""} placeholder="2.0L 4-Cylinder Turbo" data-testid="input-vehicle-engine-type" />
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
                    <Input {...field} value={field.value ?? ""} placeholder="Automatic" data-testid="input-vehicle-transmission" />
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
                    <Input {...field} value={field.value ?? ""} placeholder="FWD" data-testid="input-vehicle-drivetrain" />
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
                    <Input {...field} value={field.value ?? ""} placeholder="Gasoline" data-testid="input-vehicle-fuel-type" />
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
