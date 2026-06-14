"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";

export default function NewStationPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [showWilayas, setShowWilayas] = useState(false);
  const [form, setForm] = useState({
    name: "", wilaya: "", wilayaCode: "", address: "", phone: "", email: "", whatsapp: "", logoUrl: "",
  });

  const { data: wilayas = [] } = useQuery<any[]>({
    queryKey: ["wilayas"],
    queryFn: () => fetch("/api/wilayas").then((r) => r.json()),
  });

  const filtered = wilayas.filter((w: any) =>
    w.nameFr.toLowerCase().includes(wilayaSearch.toLowerCase()) ||
    w.nameAr.includes(wilayaSearch) ||
    String(w.code).includes(wilayaSearch)
  );

  const selectWilaya = (w: any) => {
    setForm((f) => ({ ...f, wilaya: w.nameFr, wilayaCode: String(w.code) }));
    setWilayaSearch(w.nameFr);
    setShowWilayas(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.wilaya) { toast.error("Name and wilaya are required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, wilayaCode: form.wilayaCode ? Number(form.wilayaCode) : null }),
      });
      if (!res.ok) throw new Error();
      toast.success("Station created");
      router.push("/dashboard/stations");
    } catch {
      toast.error("Failed to create station");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/stations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Station</h1>
          <p className="text-sm text-gray-500">Add a new academy location</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Station Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Station Name <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. HX Academy — Alger" />
              </div>

              <div className="col-span-2 space-y-1 relative">
                <Label>Wilaya <span className="text-red-500">*</span></Label>
                <Input
                  value={wilayaSearch}
                  onChange={(e) => { setWilayaSearch(e.target.value); setShowWilayas(true); }}
                  onFocus={() => setShowWilayas(true)}
                  placeholder="Search wilaya..."
                  autoComplete="off"
                />
                {showWilayas && filtered.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white dark:bg-gray-900 shadow-lg">
                    {filtered.slice(0, 20).map((w: any) => (
                      <button
                        key={w.code}
                        type="button"
                        onClick={() => selectWilaya(w)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="w-6 text-xs text-gray-400">{w.code}</span>
                        <span>{w.nameFr}</span>
                        <span className="ms-auto text-gray-400">{w.nameAr}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+213 ..." />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="+213 ..." />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Logo URL</Label>
                <Input value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, neighborhood..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" asChild><Link href="/dashboard/stations">Cancel</Link></Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Station"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
