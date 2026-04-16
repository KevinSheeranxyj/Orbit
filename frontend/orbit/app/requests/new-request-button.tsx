"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitRequestModal } from "./submit-request-modal";

export function NewRequestButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)} className="gap-1.5">
                <Plus size={14} />
                New Request
            </Button>
            <SubmitRequestModal isOpen={open} onClose={() => setOpen(false)} />
        </>
    );
}
