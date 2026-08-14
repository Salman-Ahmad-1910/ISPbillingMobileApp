import React from 'react';
import {UserX} from 'lucide-react-native';
import SystemLogsList from '../../components/SystemLogsList';

export default function DeletedMembersScreen() {
  return (
    <SystemLogsList
      title="Deleted Members"
      subtitle="View all deleted subscribers, staff, dealers and recovery officers."
      icon={UserX}
      accent={['#3B82F6', '#6366F1']}
      includePages={['subscribers', 'connections', 'users', 'hr', 'staff', 'dealers', 'recovery-officers']}
      showRestore
    />
  );
}
