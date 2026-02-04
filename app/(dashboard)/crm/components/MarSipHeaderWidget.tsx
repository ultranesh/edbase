'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '../../../components/LanguageProvider';

const MarSipWidget = dynamic(() => import('./MarSipWidget'), { ssr: false });

export default function MarSipHeaderWidget() {
  const { t } = useLanguage();
  return <MarSipWidget t={t} />;
}
