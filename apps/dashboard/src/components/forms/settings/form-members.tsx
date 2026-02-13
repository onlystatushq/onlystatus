"use client";

import {
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@openstatus/ui/components/ui/tabs";

import {
  FormCardContent,
  FormCardDescription,
  FormCardHeader,
  FormCardSeparator,
  FormCardTitle,
} from "@/components/forms/form-card";

import { Button } from "@openstatus/ui/components/ui/button";
import { FormCardFooter } from "../form-card";

import { FormCard } from "@/components/forms/form-card";
import { Tabs } from "@openstatus/ui/components/ui/tabs";

import { DataTable as MembersDataTable } from "@/components/data-table/settings/members/data-table";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@openstatus/ui/components/ui/form";
import { Input } from "@openstatus/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@openstatus/ui/components/ui/select";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email(),
  password: z.string().min(12, "Password must be at least 12 characters"),
  role: z.enum(["admin", "member"]),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

export function FormMembers({
  isRoot,
  onCreate,
}: {
  isRoot?: boolean;
  onCreate: (values: CreateUserValues) => Promise<void>;
}) {
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "member",
    },
  });
  const [isPending, startTransition] = useTransition();

  function submitAction(values: CreateUserValues) {
    if (isPending) return;

    startTransition(async () => {
      try {
        const promise = onCreate(values);
        toast.promise(promise, {
          loading: "Creating account...",
          success: () => "Account created",
          error: "Failed to create account",
        });
        await promise;
        form.reset();
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitAction)}>
        <FormCard>
          <FormCardHeader>
            <FormCardTitle>Team</FormCardTitle>
            <FormCardDescription>Manage your team members.</FormCardDescription>
          </FormCardHeader>
          <FormCardContent>
            <Tabs defaultValue="members">
              <TabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
              </TabsList>
              <TabsContent value="members">
                <MembersDataTable />
              </TabsContent>
            </Tabs>
          </FormCardContent>
          {isRoot && (
            <>
              <FormCardSeparator />
              <FormCardContent>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="user@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Min 12 characters"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormCardDescription>
                          User will be required to change this password on first
                          login.
                        </FormCardDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormCardContent>
              <FormCardFooter>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Account"}
                </Button>
              </FormCardFooter>
            </>
          )}
        </FormCard>
      </form>
    </Form>
  );
}
