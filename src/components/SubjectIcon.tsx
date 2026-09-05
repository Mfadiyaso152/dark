import React from 'react';
import {
  FlaskConical,
  Calculator,
  BookOpenCheck,
  Cpu,
  Brain,
  PenTool,
  Sparkles,
  Zap,
  Dna,
  TreePine,
  GraduationCap,
  FileText
} from 'lucide-react';

interface SubjectIconProps {
  name: string;
  className?: string;
}

export const SubjectIcon: React.FC<SubjectIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'BookOpenCheck':
      return <BookOpenCheck className={className} />;
    case 'Cpu':
      return <Cpu className={className} />;
    case 'Brain':
      return <Brain className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Dna':
      return <Dna className={className} />;
    case 'TreePine':
      return <TreePine className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    default:
      return <FileText className={className} />;
  }
};
