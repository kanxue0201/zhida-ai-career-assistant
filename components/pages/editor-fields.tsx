"use client";

import { useId, useState } from "react";

const EXPERIENCE_OPTIONS = ["在校", "应届", "1 年以内", "1—3 年", "3—5 年", "5—10 年", "10 年以上"];
const SKILL_CATEGORY_OPTIONS = ["编程语言", "前端开发", "后端开发", "数据库", "AI 与工具", "设计与协作", "其他"];
const DEGREE_OPTIONS = ["高中", "大专", "本科", "硕士", "MBA", "博士", "其他"];

const REGIONS = [
  { name: "北京", cities: ["北京"] }, { name: "天津", cities: ["天津"] },
  { name: "上海", cities: ["上海"] }, { name: "重庆", cities: ["重庆"] },
  { name: "河北", cities: ["石家庄", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水", "雄安新区"] },
  { name: "山西", cities: ["太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁"] },
  { name: "内蒙古", cities: ["呼和浩特", "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布"] },
  { name: "辽宁", cities: ["沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛"] },
  { name: "吉林", cities: ["长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边"] },
  { name: "黑龙江", cities: ["哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭"] },
  { name: "江苏", cities: ["南京", "无锡", "徐州", "常州", "苏州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁"] },
  { name: "浙江", cities: ["杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水"] },
  { name: "安徽", cities: ["合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城"] },
  { name: "福建", cities: ["福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德"] },
  { name: "江西", cities: ["南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶"] },
  { name: "山东", cities: ["济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽"] },
  { name: "河南", cities: ["郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店", "济源"] },
  { name: "湖北", cities: ["武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施"] },
  { name: "湖南", cities: ["长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西"] },
  { name: "广东", cities: ["广州", "韶关", "深圳", "珠海", "汕头", "佛山", "江门", "湛江", "茂名", "肇庆", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮"] },
  { name: "广西", cities: ["南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左"] },
  { name: "海南", cities: ["海口", "三亚", "三沙", "儋州", "五指山", "琼海", "文昌", "万宁", "东方", "其他"] },
  { name: "四川", cities: ["成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳", "阿坝", "甘孜", "凉山"] },
  { name: "贵州", cities: ["贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁", "黔西南", "黔东南", "黔南"] },
  { name: "云南", cities: ["昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧", "楚雄", "红河", "文山", "西双版纳", "大理", "德宏", "怒江", "迪庆"] },
  { name: "西藏", cities: ["拉萨", "日喀则", "昌都", "林芝", "山南", "那曲", "阿里"] },
  { name: "陕西", cities: ["西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛"] },
  { name: "甘肃", cities: ["兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南", "临夏", "甘南"] },
  { name: "青海", cities: ["西宁", "海东", "海北", "黄南", "海南州", "果洛", "玉树", "海西"] },
  { name: "宁夏", cities: ["银川", "石嘴山", "吴忠", "固原", "中卫"] },
  { name: "新疆", cities: ["乌鲁木齐", "克拉玛依", "吐鲁番", "哈密", "昌吉", "博尔塔拉", "巴音郭楞", "阿克苏", "克孜勒苏", "喀什", "和田", "伊犁", "塔城", "阿勒泰", "石河子", "其他"] },
  { name: "香港", cities: ["香港"] }, { name: "澳门", cities: ["澳门"] },
  { name: "台湾", cities: ["台北", "新北", "桃园", "台中", "台南", "高雄", "基隆", "新竹", "嘉义", "其他"] },
];

const SINGLE_CITY_REGIONS = new Set(["北京", "天津", "上海", "重庆", "香港", "澳门"]);
const YEARS = Array.from({ length: 86 }, (_, index) => String(2035 - index));
const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

function FieldLabel({ label, optional = false }: { label: string; optional?: boolean }) {
  return <span className="ed-field-label"><span>{label}</span>{optional && <small>可选</small>}</span>;
}

export function ComboField({ label, value, onChange, options, maxLength = 40, optional = false, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; options: string[];
  maxLength?: number; optional?: boolean; placeholder?: string;
}) {
  const listId = useId();
  return <label className="ed-field"><FieldLabel label={label} optional={optional} />
    <input value={value} list={listId} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist>
  </label>;
}

export function ExperienceField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [custom, setCustom] = useState(false);
  const hasCustomValue = Boolean(value && !EXPERIENCE_OPTIONS.includes(value));

  if (custom) {
    return <div className="ed-field"><FieldLabel label="经验标签" optional />
      <input aria-label="自定义经验标签" value={value} maxLength={40} placeholder="输入自定义经验标签" onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="ed-field-action" onClick={() => setCustom(false)}>返回下拉选择</button>
    </div>;
  }

  return <label className="ed-field"><FieldLabel label="经验标签" optional />
    <select aria-label="经验标签" value={value} onChange={(event) => {
      if (event.target.value === "__custom") {
        setCustom(true);
        return;
      }
      onChange(event.target.value);
    }}>
      <option value="">选择经验标签</option>
      {hasCustomValue && <option value={value}>{value}</option>}
      {EXPERIENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
      <option value="__custom">自定义</option>
    </select>
  </label>;
}

export function SkillCategoryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <ComboField label="类别" value={value} onChange={onChange} options={SKILL_CATEGORY_OPTIONS} placeholder="选择或自定义类别" />;
}

function formatLocation(regionName: string, city: string) {
  if (!regionName) return "";
  if (SINGLE_CITY_REGIONS.has(regionName)) return regionName;
  return city ? `${regionName} · ${city}` : "";
}

function parseLocation(value: string) {
  if (!value) return null;
  for (const region of REGIONS) {
    if (value === region.name) return { province: region.name, city: "" };
    for (const city of region.cities) {
      if (value === formatLocation(region.name, city) || value === city) return { province: region.name, city };
    }
  }
  return null;
}

export function LocationField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const initial = parseLocation(value);
  const [province, setProvince] = useState(initial?.province || "");
  const [city, setCity] = useState(initial?.city || "");
  const [custom, setCustom] = useState(Boolean(value && !initial));
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    if (!custom) {
      const parsed = parseLocation(value);
      if (parsed) {
        setProvince(parsed.province);
        setCity(parsed.city);
      } else if (value) {
        setProvince("");
        setCity("");
        setCustom(true);
      } else {
        setCity("");
      }
    }
  }

  const region = REGIONS.find((item) => item.name === province);

  if (custom) {
    return <div className="ed-field"><FieldLabel label="所在城市" optional />
      <input value={value} maxLength={60} placeholder="输入城市、国家或地区" onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="ed-field-action" onClick={() => { setCustom(false); setProvince(""); setCity(""); }}>返回省市选择</button>
    </div>;
  }

  return <div className="ed-field ed-location-field"><FieldLabel label="所在城市" optional />
    <div className="ed-location-grid">
      <select aria-label="所在省份或地区" value={province} onChange={(event) => {
        const next = event.target.value;
        if (next === "__custom") { setCustom(true); return; }
        setProvince(next);
        setCity("");
        onChange(SINGLE_CITY_REGIONS.has(next) ? next : "");
      }}>
        <option value="">选择省 / 地区</option>
        {REGIONS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        <option value="__custom">其他 / 海外（自定义）</option>
      </select>
      <select aria-label="所在城市" value={city} disabled={!region || SINGLE_CITY_REGIONS.has(province)} onChange={(event) => {
        setCity(event.target.value);
        onChange(formatLocation(province, event.target.value));
      }}>
        <option value="">{SINGLE_CITY_REGIONS.has(province) ? "无需选择" : "选择城市"}</option>
        {region?.cities.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </div>
  </div>;
}

type PeriodParts = { startYear: string; startMonth: string; endYear: string; endMonth: string; present: boolean };
const EMPTY_PERIOD: PeriodParts = { startYear: "", startMonth: "", endYear: "", endMonth: "", present: false };

function parsePeriod(value: string): PeriodParts | null {
  if (!value) return { ...EMPTY_PERIOD };
  const dates = [...value.matchAll(/(?:19|20)\d{2}(?:[.\-/年]\d{1,2})?/g)].map((match) => match[0]);
  if (!dates.length || dates.length > 2) return null;
  const parseDate = (date: string) => {
    const match = date.match(/((?:19|20)\d{2})(?:[.\-/年](\d{1,2}))?/);
    if (!match || (match[2] && (Number(match[2]) < 1 || Number(match[2]) > 12))) return null;
    return { year: match[1], month: match[2]?.padStart(2, "0") || "" };
  };
  const start = parseDate(dates[0]);
  const end = dates[1] ? parseDate(dates[1]) : null;
  if (!start || (dates[1] && !end)) return null;
  return {
    startYear: start.year, startMonth: start.month,
    endYear: end?.year || "", endMonth: end?.month || "",
    present: !dates[1] && /至今|进行中|现在|目前|Present|Now/i.test(value),
  };
}

function formatYearMonth(year: string, month: string) {
  if (!year) return "";
  return month ? `${year}.${month}` : year;
}

function isPeriodValid(parts: PeriodParts) {
  if (!parts.startYear || !parts.endYear || parts.present) return true;
  const start = Number(parts.startYear) * 12 + Number(parts.startMonth || 1);
  const end = Number(parts.endYear) * 12 + Number(parts.endMonth || 1);
  return end >= start;
}

function PeriodSelects({ prefix, year, month, disabled = false, onChange }: {
  prefix: string; year: string; month: string; disabled?: boolean;
  onChange: (year: string, month: string) => void;
}) {
  return <div className="ed-period-selects">
    <select aria-label={`${prefix}年份`} value={year} disabled={disabled} onChange={(event) => onChange(event.target.value, month)}>
      <option value="">年份</option>{YEARS.map((item) => <option key={item} value={item}>{item} 年</option>)}
    </select>
    <select aria-label={`${prefix}月份`} value={month} disabled={disabled || !year} onChange={(event) => onChange(year, event.target.value)}>
      <option value="">月份</option>{MONTHS.map((item) => <option key={item} value={item}>{Number(item)} 月</option>)}
    </select>
  </div>;
}

export function PeriodField({ value, onChange, optional = true, presentLabel = "至今" }: {
  value: string; onChange: (value: string) => void; optional?: boolean; presentLabel?: string;
}) {
  const initial = parsePeriod(value);
  const [parts, setParts] = useState<PeriodParts>(initial || { ...EMPTY_PERIOD });
  const [custom, setCustom] = useState(Boolean(value && !initial));
  const [error, setError] = useState("");
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    if (!custom) {
      const parsed = parsePeriod(value);
      if (parsed) {
        setParts(parsed);
      } else if (value) {
        setCustom(true);
      }
    }
  }

  function update(patch: Partial<PeriodParts>) {
    const next = { ...parts, ...patch };
    setParts(next);
    if (!isPeriodValid(next)) {
      setError("结束时间不能早于开始时间");
      return;
    }
    setError("");
    const start = formatYearMonth(next.startYear, next.startMonth);
    const end = next.present ? presentLabel : formatYearMonth(next.endYear, next.endMonth);
    onChange(start && end ? `${start} — ${end}` : start || end);
  }

  return <div className="ed-field ed-period-field"><FieldLabel label="时间" optional={optional} />
    {custom ? <>
      <input value={value} maxLength={40} placeholder="如：2024.09 — 2025.06" onChange={(event) => onChange(event.target.value)} />
      <button type="button" className="ed-field-action" onClick={() => { setCustom(false); setParts(parsePeriod(value) || { ...EMPTY_PERIOD }); setError(""); }}>使用日期选择</button>
    </> : <>
      <div className="ed-period-row"><span>开始</span><PeriodSelects prefix="开始" year={parts.startYear} month={parts.startMonth} onChange={(startYear, startMonth) => update({ startYear, startMonth })} /></div>
      <div className="ed-period-row"><span>结束</span><PeriodSelects prefix="结束" year={parts.endYear} month={parts.endMonth} disabled={parts.present} onChange={(endYear, endMonth) => update({ endYear, endMonth })} /></div>
      <div className="ed-period-actions">
        <label className="ed-present"><input type="checkbox" checked={parts.present} disabled={!parts.startYear} onChange={(event) => update({ present: event.target.checked })} />{presentLabel}</label>
        <button type="button" className="ed-field-action" onClick={() => { setCustom(true); setError(""); }}>自定义</button>
      </div>
    </>}
    {error && <small className="ed-field-error" role="alert">{error}</small>}
  </div>;
}

function parseDegree(value: string) {
  for (const degree of DEGREE_OPTIONS) {
    if (value === degree) return { degree, major: "" };
    if (value.startsWith(degree)) {
      const major = value.slice(degree.length).replace(/^[\s·/、—-]+/, "");
      if (major) return { degree, major };
    }
  }
  return { degree: "", major: value };
}

export function DegreeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { degree, major } = parseDegree(value);
  function update(nextDegree: string, nextMajor: string) {
    onChange([nextDegree, nextMajor].filter(Boolean).join(" · "));
  }
  return <div className="ed-field"><FieldLabel label="学历 / 专业" optional />
    <div className="ed-degree-grid">
      <select aria-label="学历" value={degree} onChange={(event) => update(event.target.value, major)}>
        <option value="">选择学历</option>{DEGREE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <input aria-label="专业" value={major} maxLength={50} placeholder="输入专业" onChange={(event) => update(degree, event.target.value)} />
    </div>
  </div>;
}
