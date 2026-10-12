/** 构建前校验套餐表：价格与周期不跨档错配、每组都有档位、退款配置不空 */
import { planConsistencyErrors } from '../config/plans'
import { refundConfigConsistent } from '../config/rules'
const errors = [...planConsistencyErrors(), ...refundConfigConsistent()]
if (errors.length) {
  console.error('[plans] 校验失败：')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}
console.log('[plans] 套餐表与退款配置校验通过')
