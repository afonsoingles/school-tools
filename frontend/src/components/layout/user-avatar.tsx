"use client"

import md5 from "blueimp-md5"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function gravatarUrl(email: string, size: number) {
  const hash = md5(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404&r=g`
}

export function UserAvatar({
  user,
  size,
  className,
  fallbackClassName,
}: {
  user: { name: string; email: string }
  size?: "default" | "sm" | "lg"
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={gravatarUrl(user.email, 96)} alt={`${user.name}'s avatar`} />
      <AvatarFallback className={fallbackClassName}>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )
}