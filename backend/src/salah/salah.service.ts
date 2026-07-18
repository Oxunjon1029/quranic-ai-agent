import { Injectable, Logger } from '@nestjs/common';

export enum SalahStep {
  TAKBIR = 'TAKBIR',
  FATIHA = 'FATIHA',
  SURAH = 'SURAH',
  RUKU = 'RUKU',
  SUJUD = 'SUJUD',
  TASHAHHUD = 'TASHAHHUD',
  SALAM = 'SALAM',
}

const SALAH_SEQUENCE = [
  SalahStep.TAKBIR,
  SalahStep.FATIHA,
  SalahStep.SURAH,
  SalahStep.RUKU,
  SalahStep.SUJUD,
  SalahStep.TASHAHHUD,
  SalahStep.SALAM,
];

@Injectable()
export class SalahFlowService {
  private readonly logger = new Logger(SalahFlowService.name);

  getNextStep(currentStep?: SalahStep): SalahStep {
    if (!currentStep) return SALAH_SEQUENCE[0];
    const idx = SALAH_SEQUENCE.indexOf(currentStep);
    if (idx === -1 || idx === SALAH_SEQUENCE.length - 1) {
      return SalahStep.SALAM;
    }
    return SALAH_SEQUENCE[idx + 1];
  }

  getExpectedTextForStep(step: SalahStep): string {
    switch (step) {
      case SalahStep.TAKBIR: return 'الله أكبر';
      case SalahStep.FATIHA: return 'بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين إياك نعبد وإياك نستعين اهدنا الصراط المستقيم صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين';
      case SalahStep.SURAH: return 'قل هو الله أحد الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد';
      case SalahStep.RUKU: return 'سبحان ربي العظيم';
      case SalahStep.SUJUD: return 'سبحان ربي الأعلى';
      case SalahStep.TASHAHHUD: return 'التحيات لله والصلوات والطيبات السلام عليك أيها النبي ورحمة الله وبركاته السلام علينا وعلى عباد الله الصالحين أشهد أن لا إله إلا الله وأشهد أن محمدا عبده ورسوله';
      case SalahStep.SALAM: return 'السلام عليكم ورحمة الله';
      default: return '';
    }
  }
}
