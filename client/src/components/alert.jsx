import React from 'react';

export const Alert = ({ variant, children }) => {
    const variantClasses = {
        destructive: 'bg-red-100 border-red-200 text-red-800',
        success: 'bg-green-100 border-green-200 text-green-800',
    };

    return (
        <div className={`p-4 border rounded ${variantClasses[variant]}`}>
            {children}
        </div>
    );
};

export const AlertDescription = ({ children }) => {
    return <div>{children}</div>;
};