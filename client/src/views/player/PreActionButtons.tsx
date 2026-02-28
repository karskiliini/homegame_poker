import type { PreActionType } from '@poker/shared';
import { useT } from '../../hooks/useT.js';

interface PreActionButtonsProps {
  preAction: PreActionType | null;
  setPreAction: (value: PreActionType | null) => void;
}

export function PreActionButtons({ preAction, setPreAction }: PreActionButtonsProps) {
  const t = useT();

  const toggle = (type: PreActionType) => {
    setPreAction(preAction === type ? null : type);
  };

  return (
    <div className="flex gap-3 justify-center py-4">
      <PreActionToggle
        label={t('preaction_check_fold')}
        active={preAction === 'check_fold'}
        color="fold"
        onClick={() => toggle('check_fold')}
      />
      <PreActionToggle
        label={t('preaction_check')}
        active={preAction === 'auto_check'}
        color="check"
        onClick={() => toggle('auto_check')}
      />
    </div>
  );
}

function PreActionToggle({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: 'fold' | 'check';
  onClick: () => void;
}) {
  const borderColor = active
    ? color === 'fold' ? '#DC2626' : '#EAB308'
    : 'rgba(255,255,255,0.2)';
  const bgColor = active
    ? color === 'fold' ? 'rgba(220,38,38,0.15)' : 'rgba(234,179,8,0.15)'
    : 'rgba(255,255,255,0.05)';
  const textColor = active
    ? color === 'fold' ? '#FCA5A5' : '#FDE047'
    : 'rgba(255,255,255,0.5)';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        background: bgColor,
        color: textColor,
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minWidth: 100,
      }}
    >
      {active && '✓ '}{label}
    </button>
  );
}
