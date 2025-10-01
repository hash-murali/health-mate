import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Droplet, Weight, Target, TrendingUp, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface DailySummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

interface Goals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_water_ml: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [summary, setSummary] = useState<DailySummary>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    water: 0,
  });
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load goals
      const { data: goalsData } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (goalsData) {
        setGoals(goalsData);
      }

      // Load today's data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get meals
      const { data: meals } = await supabase
        .from("meals")
        .select(`
          id,
          meal_items (
            calories,
            protein,
            carbs,
            fat
          )
        `)
        .eq("user_id", user.id)
        .gte("eaten_at", today.toISOString())
        .lt("eaten_at", tomorrow.toISOString());

      // Calculate totals
      let totalCals = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      meals?.forEach((meal) => {
        meal.meal_items.forEach((item: any) => {
          totalCals += Number(item.calories) || 0;
          totalProtein += Number(item.protein) || 0;
          totalCarbs += Number(item.carbs) || 0;
          totalFat += Number(item.fat) || 0;
        });
      });

      // Get water
      const { data: waterLogs } = await supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", today.toISOString())
        .lt("logged_at", tomorrow.toISOString());

      const totalWater = waterLogs?.reduce((sum, log) => sum + Number(log.amount_ml), 0) || 0;

      setSummary({
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        water: totalWater,
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast({
        title: "Error loading data",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (amount: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("water_logs")
        .insert({
          user_id: user.id,
          amount_ml: amount,
          logged_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSummary((prev) => ({ ...prev, water: prev.water + amount }));
      toast({
        title: "Water logged!",
        description: `Added ${amount}ml to your daily intake`,
      });
    } catch (error) {
      console.error("Error adding water:", error);
      toast({
        title: "Error",
        description: "Failed to log water",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const caloriePercent = goals ? (summary.calories / goals.daily_calories) * 100 : 0;
  const waterPercent = goals ? (summary.water / goals.daily_water_ml) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Today's Progress</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Calories Card */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Calories
            </span>
            <span className="text-2xl font-bold">
              {Math.round(summary.calories)}/{goals?.daily_calories || 2000}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={Math.min(caloriePercent, 100)} className="h-3" />
          
          {/* Macros */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Protein</p>
              <p className="text-lg font-semibold text-primary">{Math.round(summary.protein)}g</p>
              <p className="text-xs text-muted-foreground">/ {goals?.daily_protein || 150}g</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Carbs</p>
              <p className="text-lg font-semibold text-accent">{Math.round(summary.carbs)}g</p>
              <p className="text-xs text-muted-foreground">/ {goals?.daily_carbs || 200}g</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Fat</p>
              <p className="text-lg font-semibold text-warning">{Math.round(summary.fat)}g</p>
              <p className="text-xs text-muted-foreground">/ {goals?.daily_fat || 65}g</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Water Card */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Droplet className="h-5 w-5 text-accent" />
              Water
            </span>
            <span className="text-2xl font-bold">
              {Math.round(summary.water)}ml
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={Math.min(waterPercent, 100)} className="h-3" />
          <div className="flex gap-2">
            <Button
              onClick={() => addWater(250)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              +250ml
            </Button>
            <Button
              onClick={() => addWater(500)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              +500ml
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className="shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/log")}
        >
          <CardContent className="pt-6 text-center">
            <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-semibold">Log Meal</p>
          </CardContent>
        </Card>
        
        <Card
          className="shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/insights")}
        >
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-accent" />
            <p className="font-semibold">View Insights</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
