"use client";
import { ErrorState } from "@orgtik/ui";
export default function ErrorBoundary({retry}:{retry:()=>void}){return <ErrorState titleAs="h1" onRetry={retry}/>;}
