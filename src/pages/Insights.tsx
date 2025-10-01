import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Calendar, Target } from "lucide-react";

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

const Insights = () => {
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeekData();
  }, []);

  const loadWeekData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get meals from last 7 days
      const { data: meals } = await supabase
        .from("meals")
        .select(`
          eaten_at,
          meal_items (
            calories,
            protein,
            carbs,
            fat
          )
        `)
        .eq("user_id", user.id)
        .gte("eaten_at", weekAgo.toISOString())
        .order("eaten_at", { ascending: false });

      // Get water logs
      const { data: waterLogs } = await supabase
        .from("water_logs")
        .select("logged_at, amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", weekAgo.toISOString());

      // Process data by day
      const dataByDay: Record<string, DayData> = {};
      
      meals?.forEach((meal) => {
        const date = new Date(meal.eaten_at).toLocaleDateString();
        if (!dataByDay[date]) {
          dataByDay[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
        }
        
        meal.meal_items.forEach((item: any) => {
          dataByDay[date].calories += Number(item.calories) || 0;
          dataByDay[date].protein += Number(item.protein) || 0;
          dataByDay[date].carbs += Number(item.carbs) || 0;
          dataByDay[date].fat += Number(item.fat) || 0;
        });
      });

      waterLogs?.forEach((log) => {
        const date = new Date(log.logged_at).toLocaleDateString();
        if (!dataByDay[date]) {
          dataByDay[date] = { date, calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 };
        }
        dataByDay[date].water += Number(log.amount_ml) || 0;
      });

      setWeekData(Object.values(dataByDay).slice(0, 7));
    } catch (error) {
      console.error("Error loading week data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  const avgCalories = weekData.length > 0
    ? Math.round(weekData.reduce((sum, d) => sum + d.calories, 0) / weekData.length)
    : 0;
  
  const avgProtein = weekData.length > 0
    ? Math.round(weekData.reduce((sum, d) => sum + d.protein, 0) / weekData.length)
    : 0;

  const avgWater = weekData.length > 0
    ? Math.round(weekData.reduce((sum, d) => sum + d.water, 0) / weekData.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Insights</h1>
        <p className="text-muted-foreground">Your progress over time</p>
      </div>

      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="week">Last 7 Days</TabsTrigger>
          <TabsTrigger value="month" disabled>Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-4 mt-6">
          {/* Average Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Avg Calories</p>
                <p className="text-2xl font-bold text-primary">{avgCalories}</p>
                <p className="text-xs text-muted-foreground">per day</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Avg Protein</p>
                <p className="text-2xl font-bold text-accent">{avgProtein}g</p>
                <p className="text-xs text-muted-foreground">per day</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Avg Water</p>
                <p className="text-2xl font-bold text-blue-500">{avgWater}ml</p>
                <p className="text-xs text-muted-foreground">per day</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Breakdown */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weekData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No data yet. Start logging meals to see your progress!
                </p>
              ) : (
                weekData.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{day.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(day.protein)}g protein • {Math.round(day.water)}ml water
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {Math.round(day.calories)}
                      </p>
                      <p className="text-xs text-muted-foreground">calories</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Streaks & Goals */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 text-primary" />
                <p className="text-lg font-semibold mb-2">
                  {weekData.length} days tracked this week
                </p>
                <p className="text-sm text-muted-foreground">
                  Keep it up! Consistency is key to reaching your goals.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Insights;
