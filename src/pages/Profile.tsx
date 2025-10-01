import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Target, LogOut, Save } from "lucide-react";

interface Profile {
  full_name: string;
  height_cm: number | null;
  current_weight_kg: number | null;
}

interface Goals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_water_ml: number;
}

const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    height_cm: null,
    current_weight_kg: null,
  });
  const [goals, setGoals] = useState<Goals>({
    daily_calories: 2000,
    daily_protein: 150,
    daily_carbs: 200,
    daily_fat: 65,
    daily_water_ml: 2000,
  });

  useEffect(() => {
    loadProfile();
    loadGoals();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          height_cm: data.height_cm,
          current_weight_kg: data.current_weight_kg,
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (data) {
        setGoals({
          daily_calories: Number(data.daily_calories),
          daily_protein: Number(data.daily_protein),
          daily_carbs: Number(data.daily_carbs),
          daily_fat: Number(data.daily_fat),
          daily_water_ml: Number(data.daily_water_ml),
        });
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          height_cm: profile.height_cm,
          current_weight_kg: profile.current_weight_kg,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your changes have been saved",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if goals exist
      const { data: existing } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("goals")
          .update(goals)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("goals")
          .insert({
            user_id: user.id,
            ...goals,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Goals updated",
        description: "Your daily targets have been saved",
      });
    } catch (error) {
      console.error("Error saving goals:", error);
      toast({
        title: "Error",
        description: "Failed to save goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground">Manage your account & goals</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={profile.height_cm || ""}
                onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
                placeholder="170"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={profile.current_weight_kg || ""}
                onChange={(e) => setProfile({ ...profile, current_weight_kg: Number(e.target.value) })}
                placeholder="70"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Goals Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Daily Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calories">Calories</Label>
            <Input
              id="calories"
              type="number"
              value={goals.daily_calories}
              onChange={(e) => setGoals({ ...goals, daily_calories: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                value={goals.daily_protein}
                onChange={(e) => setGoals({ ...goals, daily_protein: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                value={goals.daily_carbs}
                onChange={(e) => setGoals({ ...goals, daily_carbs: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                value={goals.daily_fat}
                onChange={(e) => setGoals({ ...goals, daily_fat: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="water">Water (ml)</Label>
            <Input
              id="water"
              type="number"
              value={goals.daily_water_ml}
              onChange={(e) => setGoals({ ...goals, daily_water_ml: Number(e.target.value) })}
            />
          </div>
          <Button onClick={handleSaveGoals} disabled={loading} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Goals
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
