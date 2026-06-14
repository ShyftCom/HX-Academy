"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Phone, Mail, Users, Building2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function formatDA(n: number) { return n.toLocaleString("fr-DZ") + " DA"; }

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: station, isLoading } = useQuery({
    queryKey: ["station", id],
    queryFn: () => fetch(`/api/stations/${id}`).then((r) => r.json()),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  const updateMut = useMutation({
    mutationFn: (data: any) => fetch(`/api/stations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["station", id] }); toast.success("Station updated"); setEditing(false); },
    onError: () => toast.error("Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: () => fetch(`/api/stations/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Station deleted"); router.push("/dashboard/stations"); },
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-gray-400">Loading...</div>;
  if (!station || station.error) return <div className="p-8 text-center text-sm text-red-400">Station not found</div>;

  const startEdit = () => {
    setForm({ name: station.name, wilaya: station.wilaya, address: station.address, phone: station.phone, email: station.email, whatsapp: station.whatsapp });
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/stations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{station.name}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{station.wilaya}</p>
        </div>
        <Badge variant={station.status === "active" ? "default" : "secondary"}>{station.status}</Badge>
        <Button variant="outline" onClick={startEdit}>Edit</Button>
        <Button variant="destructive" onClick={() => { if (confirm("Delete this station?")) deleteMut.mutate(); }}>Delete</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff ({station.stationStaff?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Players</p><p className="text-2xl font-bold">{station._count?.players ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Leads</p><p className="text-2xl font-bold">{station._count?.leads ?? 0}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-xs text-gray-500">Meetings</p><p className="text-2xl font-bold">{station._count?.meetings ?? 0}</p></CardContent></Card>
          </div>
          <Card>
            <CardContent className="pt-4 space-y-2">
              {station.address && <p className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-gray-400" />{station.address}</p>}
              {station.phone && <p className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{station.phone}</p>}
              {station.email && <p className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{station.email}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {station.stationStaff?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No staff assigned to this station.</p>
              ) : (
                <div className="space-y-2">
                  {station.stationStaff?.map((ss: any) => (
                    <div key={ss.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                      <Users className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{ss.user.name}</p>
                        <p className="text-xs text-gray-400">{ss.user.email}</p>
                      </div>
                      {ss.role && <Badge variant="secondary" className="ms-auto">{ss.role}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          {editing ? (
            <Card>
              <CardHeader><CardTitle>Edit Station</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
                  <div className="col-span-2 space-y-1"><Label>Wilaya</Label><Input value={form.wilaya ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, wilaya: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, whatsapp: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
                  <div className="col-span-2 space-y-1"><Label>Address</Label><Input value={form.address ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-gray-400">Click Edit to modify station settings.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
