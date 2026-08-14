import React from 'react';
import {Trash2} from 'lucide-react-native';
import SystemLogsList from '../../components/SystemLogsList';

export default function DeletedCollectionsScreen() {
  return (
    <SystemLogsList
      title="Deleted Collection"
      subtitle="View all deleted collection and payment records."
      icon={Trash2}
      accent={['#F43F5E', '#E11D48']}
      includePages={['billing', 'dealers', 'financial']}
      showRestore
    />
  );
}
