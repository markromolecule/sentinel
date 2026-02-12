import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type PermissionCardProps } from '@/features/exam/types';

const ICON_MAP = {
     camera: { name: 'camera' as const, grantedName: 'camera' as const },
     mic: { name: 'mic' as const, grantedName: 'mic' as const },
};

export function PermissionCard({
     icon,
     title,
     description,
     granted,
     onToggle,
     colors,
     isDark,
}: PermissionCardProps) {
     const iconConfig = ICON_MAP[icon];

     return (
          <TouchableOpacity
               onPress={onToggle}
               activeOpacity={0.7}
               accessibilityLabel={`${title} permission — ${granted ? 'granted' : 'tap to grant'}`}
               accessibilityRole="button"
               style={{
                    backgroundColor: colors.card,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: granted ? '#10b981' : colors.border,
                    padding: 20,
                    marginBottom: 14,
               }}
          >
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {/* Icon */}
                    <View
                         style={{
                              width: 48,
                              height: 48,
                              borderRadius: 14,
                              backgroundColor: granted
                                   ? 'rgba(16, 185, 129, 0.1)'
                                   : isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.04)',
                              alignItems: 'center',
                              justifyContent: 'center',
                         }}
                    >
                         <Ionicons
                              name={granted ? iconConfig.grantedName : `${iconConfig.name}-outline`}
                              size={24}
                              color={granted ? '#10b981' : colors.icon}
                         />
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1, marginLeft: 16 }}>
                         <Text
                              style={{
                                   fontSize: 16,
                                   fontWeight: '600',
                                   color: colors.text,
                                   marginBottom: 2,
                              }}
                         >
                              {title}
                         </Text>
                         <Text
                              style={{
                                   fontSize: 13,
                                   color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280',
                                   lineHeight: 18,
                              }}
                         >
                              {description}
                         </Text>
                    </View>

                    {/* Status */}
                    <View
                         style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: granted
                                   ? '#10b981'
                                   : isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.06)',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: 12,
                         }}
                    >
                         <Ionicons
                              name={granted ? 'checkmark' : 'close'}
                              size={18}
                              color={granted ? '#fff' : colors.icon}
                         />
                    </View>
               </View>
          </TouchableOpacity>
     );
}
