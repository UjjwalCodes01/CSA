import React from 'react';

export const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-lg border px-4 py-3 text-sm ${className || ''}`}
    {...props}
  />
));
Alert.displayName = 'Alert';

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm ${className || ''}`}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';
