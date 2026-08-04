import { useEffect, useState } from 'react';
import { MdArrowUpward } from 'react-icons/md';
import { trackEvent } from './analytics';

type BackToTopProps = {
  disabled?: boolean;
  target?: 'page' | 'mobile-sheet';
};

export function BackToTop({ disabled = false, target = 'page' }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) {
      setVisible(false);
      return undefined;
    }

    if (target === 'mobile-sheet') {
      const dateList = document.querySelector<HTMLElement>('.date-sheet-list');
      if (!dateList) return undefined;

      const updateVisibility = () => setVisible(dateList.scrollTop > 280);
      dateList.addEventListener('scroll', updateVisibility, { passive: true });
      updateVisibility();

      return () => dateList.removeEventListener('scroll', updateVisibility);
    }

    const mobileLayout = window.matchMedia('(max-width: 900px)');
    const schedulePanel = document.querySelector<HTMLElement>('.schedule-panel');
    let scrollTarget: EventTarget = window;

    const updateVisibility = () => {
      const scrollTop = mobileLayout.matches || !schedulePanel ? window.scrollY : schedulePanel.scrollTop;
      setVisible(scrollTop > (mobileLayout.matches ? 320 : 520));
    };

    const bindScrollTarget = () => {
      scrollTarget.removeEventListener('scroll', updateVisibility);
      scrollTarget = mobileLayout.matches || !schedulePanel ? window : schedulePanel;
      scrollTarget.addEventListener('scroll', updateVisibility, { passive: true });
      updateVisibility();
    };

    bindScrollTarget();
    mobileLayout.addEventListener('change', bindScrollTarget);

    return () => {
      scrollTarget.removeEventListener('scroll', updateVisibility);
      mobileLayout.removeEventListener('change', bindScrollTarget);
    };
  }, [disabled, target]);

  const returnToTop = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    if (target === 'mobile-sheet') {
      document.querySelector<HTMLElement>('.date-sheet-list')?.scrollTo({ top: 0, behavior });
      trackEvent('back_to_top', { layout: 'mobile_sheet' });
      return;
    }

    const mobileLayout = window.matchMedia('(max-width: 900px)').matches;
    const schedulePanel = document.querySelector<HTMLElement>('.schedule-panel');

    if (mobileLayout || !schedulePanel) {
      window.scrollTo({ top: 0, behavior });
    } else {
      schedulePanel.scrollTo({ top: 0, behavior });
    }

    trackEvent('back_to_top', { layout: mobileLayout ? 'mobile' : 'desktop' });
  };

  return (
    <button
      className={`back-to-top${target === 'mobile-sheet' ? ' back-to-top--sheet' : ''}`}
      data-visible={visible}
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={returnToTop}
    >
      <MdArrowUpward aria-hidden="true" />
    </button>
  );
}
