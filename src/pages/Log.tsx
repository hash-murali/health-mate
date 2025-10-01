import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Log = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<string>("breakfast");
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [quantity, setQuantity] = useState("1");

  const handleScanBarcode = () => {
    toast({
      title: "Camera access needed",
      description: "Barcode scanning requires camera permissions. This feature will be available soon!",
    });
  };

  const handleLogMeal = async () => {
    if (!foodName || !calories) {
      toast({
        title: "Missing information",
        description: "Please enter at least food name and calories",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create meal
      const { data: meal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          eaten_at: new Date().toISOString(),
          meal_type: mealType,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // Create food snapshot
      const foodSnapshot = {
        name: foodName,
        serving_amount: Number(quantity),
        serving_unit: "serving",
        calories: Number(calories),
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
      };

      // Add meal item
      const { error: itemError } = await supabase
        .from("meal_items")
        .insert({
          meal_id: meal.id,
          food_snapshot: foodSnapshot,
          quantity: Number(quantity),
          calories: Number(calories) * Number(quantity),
          protein: (Number(protein) || 0) * Number(quantity),
          carbs: (Number(carbs) || 0) * Number(quantity),
          fat: (Number(fat) || 0) * Number(quantity),
        });

      if (itemError) throw itemError;

      toast({
        title: "Meal logged!",
        description: `${foodName} added to your ${mealType}`,
      });

      // Reset form
      setFoodName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setQuantity("1");
      
      // Navigate back to dashboard
      setTimeout(() => navigate("/"), 500);
    } catch (error) {
      console.error("Error logging meal:", error);
      toast({
        title: "Error",
        description: "Failed to log meal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Log Meal</h1>
        <p className="text-muted-foreground">Track what you eat</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={handleScanBarcode}
        >
          <Camera className="h-8 w-8" />
          <span>Scan Barcode</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={() => {
            toast({
              title: "Coming soon",
              description: "Food search database will be available soon!",
            });
          }}
        >
          <Search className="h-8 w-8" />
          <span>Search Foods</span>
        </Button>
      </div>

      {/* Manual Entry Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Manual Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meal-type">Meal Type</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger id="meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="food-name">Food Name *</Label>
            <Input
              id="food-name"
              placeholder="e.g., Grilled Chicken"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories">Calories *</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                placeholder="200"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                min="0"
                step="0.1"
                placeholder="30"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                min="0"
                step="0.1"
                placeholder="20"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                min="0"
                step="0.1"
                placeholder="10"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleLogMeal}
            disabled={loading || !foodName || !calories}
            className="w-full"
          >
            {loading ? "Logging..." : "Log Meal"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Log;
