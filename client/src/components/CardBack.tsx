interface CardBackProps {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-8 h-11',
  md: 'w-12 h-17',
  lg: 'w-16 h-22',
};

export function CardBack({ size = 'md' }: CardBackProps) {
  return (
    <div className={`
      ${SIZE_CLASSES[size]}
      rounded-md shadow-md
      bg-gradient-to-br from-blue-800 to-blue-950
      border border-blue-600/50
      flex items-center justify-center
    `}>
      <div className="w-[70%] h-[70%] rounded-sm border border-white/20 bg-blue-900/50" />
    </div>
  );
}
