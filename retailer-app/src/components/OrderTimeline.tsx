
import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Truck, Package, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { OrderStatus } from '../types';

interface TimelineStep {
  status: OrderStatus;
  label: string;
  icon: any;
  timestamp?: string;
}

const ALL_STEPS: TimelineStep[] = [
  { status: 'PENDING', label: 'Order Placed', icon: Clock },
  { status: 'ACCEPTED', label: 'Accepted', icon: Package },
  { status: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: Check },
];

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0, ACCEPTED: 1, DISPATCHED: 2, DELIVERED: 3,
};

export const OrderTimeline: React.FC<{
  currentStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}> = ({ currentStatus, createdAt, updatedAt }) => {
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'REJECTED';
  const currentIndex = STATUS_ORDER[currentStatus] ?? -1;

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-xl border border-rose-100">
        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
          <XCircle size={20} className="text-rose-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-rose-700">{currentStatus === 'CANCELLED' ? 'Order Cancelled' : 'Order Rejected'}</p>
          <p className="text-xs text-rose-500 mt-0.5">{new Date(updatedAt).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {ALL_STEPS.map((step, idx) => {
        const isDone = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        const isLast = idx === ALL_STEPS.length - 1;
        const Icon = step.icon;

        let timestamp = '';
        if (idx === 0) timestamp = new Date(createdAt).toLocaleString();
        else if (isCurrent) timestamp = new Date(updatedAt).toLocaleString();

        return (
          <motion.div
            key={step.status}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex gap-3"
          >
            {/* Icon + Line */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                isDone ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400",
                isCurrent && "ring-4 ring-blue-100",
              )}>
                {isCurrent && !isDone ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
              </div>
              {!isLast && (
                <div className={cn("w-0.5 h-8 transition-colors", isDone && idx < currentIndex ? "bg-blue-600" : "bg-slate-200")} />
              )}
            </div>

            {/* Text */}
            <div className="pt-1 pb-4">
              <p className={cn(
                "text-sm font-medium",
                isDone ? "text-slate-800" : "text-slate-400",
                isCurrent && "font-semibold text-blue-700",
              )}>
                {step.label}
              </p>
              {timestamp && (
                <p className="text-[11px] text-slate-400 mt-0.5">{timestamp}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
