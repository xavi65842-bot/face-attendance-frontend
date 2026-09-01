'use client';

export default function LoadingSpinner({ 
    size = 'md', 
    color = '#C1121F', 
    text = 'Loading...', 
    className = '' 
}) {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20'
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <div 
                className={`${sizeClasses[size]} rounded-full border-[3px] border-t-transparent animate-spin`}
                style={{ borderColor: `${color}40`, borderTopColor: 'transparent', borderRightColor: color }}
            />
            {text && (
                <p className="text-gray-400 text-sm font-medium animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );
}