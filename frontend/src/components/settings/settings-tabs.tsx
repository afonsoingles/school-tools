"use client"

import { BookOpen } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubjectsManager } from "@/components/settings/subjects-manager"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="subjects">
      <TabsList className="w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
        <TabsTrigger value="subjects" className="h-9 flex-none rounded-b-none border-b-2 border-transparent px-4 shadow-none hover:text-foreground data-selected:border-primary data-selected:bg-transparent data-selected:shadow-none dark:data-selected:bg-transparent">
          <BookOpen />
          Subjects
        </TabsTrigger>
      </TabsList>
      <TabsContent value="subjects">
        <SubjectsManager />
      </TabsContent>
    </Tabs>
  )
}
