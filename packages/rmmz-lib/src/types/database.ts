export interface DataTrait {
  code: number,
  dataId: number,
  value: number
}

export interface DataEffect {
  code: number
  dataId: number
  value1: number
  value2: number
}

export interface DataActor {
  id: number,
  battlerName: string
  characterIndex: number,
  characterName: string
  classId: number,
  equips: number[],
  faceIndex: number,
  faceName: string,
  traits: DataTrait[],
  initialLevel: number,
  maxLevel: number,
  name: string,
  nickname: string,
  note: string,
  profile: string
}

export interface DataItem {
  id: number
  animationId: number
  consumable: boolean,
  damage: {
    critical: boolean,
    elementId: number
    formula: string
    type: number
    variance: number
  },
  description: string
  effects: DataEffect[],
  hitType: number
  iconIndex: number
  itypeId: number
  name: string
  note: string
  occasion: number
  price: number
  repeats: number
  scope: number
  speed: number
  successRate: number
  tpGain: number
}
