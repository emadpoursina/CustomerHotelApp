/*
 * Demo app strings (en, fa) and helpers. Classic script, no build step.
 * Shared survey and shell keys must match limesurvey/themes/hotel-classic/views/subviews/hotel/i18n.twig.
 * Persian text is a proposal pending the Persian copy review (plan R11).
 */
(function () {
  'use strict';

  var S = {
    en: {
      'brand.en': 'Paradise Garden Hotel', 'brand.fa': 'باغ پردیس', 'tagline': 'Your experience matters',
      'demo': 'Demo build · placeholder brand', 'soon': 'Coming soon in the full app', 'menu': 'Menu', 'notifications': 'Notifications',
      'tab.home': 'Home', 'tab.nearby': 'Nearby', 'tab.rate': 'Rate', 'tab.dash': 'Dashboard', 'tab.services': 'Services', 'nav.main': 'Main',
      'title.home': 'Welcome', 'title.nearby': 'Nearby', 'title.rate': 'Rate your stay', 'title.dash': 'Dashboard',
      'greet.m': 'Good morning', 'greet.a': 'Good afternoon', 'greet.e': 'Good evening',
      'home.rate.t': 'Rate your stay', 'home.rate.d': 'Two minutes, anonymous',
      'home.services': 'Hotel services', 'home.nearby': 'Nearby highlights', 'seeAll': 'See all',
      'qa.room': 'Room service', 'qa.house': 'Housekeeping', 'qa.wifi': 'Wi-Fi', 'qa.late': 'Late checkout', 'qa.concierge': 'Concierge', 'qa.spa': 'Spa',
      'd.mystay': 'My stay', 'd.room': 'Room service', 'd.wifi': 'Wi-Fi', 'd.settings': 'Settings', 'd.lang': 'Language', 'd.langLocked': 'Locked while the survey is open', 'd.soon': 'Soon',
      'lang.en': 'English', 'lang.fa': 'فارسی',
      'n.search': 'Search restaurants, cafés, places…', 'n.all': 'All', 'n.restaurant': 'Restaurants', 'n.cafe': 'Cafés', 'n.poi': 'Places of interest',
      'n.open': 'Open now', 'n.sort.dist': 'Nearest', 'n.sort.rating': 'Top rated', 'n.results': '%1 places', 'n.empty.t': 'No places match', 'n.empty.d': 'Try another word or clear the filters.',
      'n.clear': 'Clear filters', 'n.isOpen': 'Open', 'n.isClosed': 'Closed', 'n.min': '%1 min walk', 'n.hours': 'Hours', 'n.dir': 'Directions', 'n.call': 'Call', 'n.save': 'Save', 'n.demo': 'Demo data',
      'n.m': '%1 m', 'n.km': '%1 km', 'n.24h': 'Open 24 hours', 'n.sheet': 'Place details',
      's.welcome.t': 'Your experience matters', 's.welcome.d': 'We would be delighted if you could take two minutes to share your experience with us.',
      's.time': 'About 2 minutes', 's.anon': 'Anonymous', 's.q9': '9 questions', 's.langNote': 'The survey stays in English once you start.',
      's.start': 'Start survey', 's.step': 'Question %1 of %2', 's.back': 'Back', 's.next': 'Continue', 's.submit': 'Submit',
      's.req': 'Required', 's.opt': 'Optional', 's.err': 'Please choose an answer to continue.', 's.placeholder': 'Write as much or as little as you like',
      's.e15.lo': 'Very poor', 's.e15.hi': 'Excellent', 's.e010.lo': 'Not at all likely', 's.e010.hi': 'Extremely likely',
      's.done.t': 'Thank you', 's.done.d': 'Thank you for taking the time to share your experience. Your feedback helps us make every stay more special.',
      's.done.home': 'Back to home', 's.done.nearby': 'Explore nearby',
      'db.view': 'Manager view (demo)', 'db.7': '7 days', 'db.30': '30 days', 'db.all': 'All', 'db.total': 'Responses', 'db.avg': 'Overall stay', 'db.nps': 'NPS',
      'db.cats': 'Satisfaction by category', 'db.n': 'n = %1', 'db.lang': 'Survey language', 'db.low': 'Low sample (%1 responses). Treat these numbers with care.',
      'db.updated': 'Updated %1', 'db.npsHelp': 'Promoters (9–10) minus detractors (0–6)', 'db.det': 'Detractors', 'db.pas': 'Passives', 'db.pro': 'Promoters', 'db.none': 'No responses in this period.',
      'db.privacy': 'Aggregates only. Guest comments are not shown here.',
      'db.unavailable': 'Dashboard data is not available yet. Start the refresh job and wait a few seconds.',
      'db.stale': 'Not refreshed since %1. Is the refresh job running?',
      'db.cat.overall': 'Overall stay', 'db.cat.cleanliness': 'Cleanliness', 'db.cat.comfort': 'Comfort', 'db.cat.staff': 'Staff', 'db.cat.breakfast': 'Breakfast', 'db.cat.facilities': 'Facilities'
    },
    fa: {
      'brand.en': 'Paradise Garden Hotel', 'brand.fa': 'باغ پردیس', 'tagline': 'تجربهٔ شما برای ما ارزشمند است',
      'demo': 'نسخهٔ نمایشی · نام تجاری موقت', 'soon': 'به‌زودی در نسخهٔ کامل', 'menu': 'منو', 'notifications': 'اعلان‌ها',
      'tab.home': 'خانه', 'tab.nearby': 'اطراف', 'tab.rate': 'نظرسنجی', 'tab.dash': 'داشبورد', 'tab.services': 'خدمات', 'nav.main': 'منوی اصلی',
      'title.home': 'خوش آمدید', 'title.nearby': 'اطراف هتل', 'title.rate': 'نظر شما دربارهٔ اقامت', 'title.dash': 'داشبورد',
      'greet.m': 'صبح بخیر', 'greet.a': 'روز بخیر', 'greet.e': 'عصر بخیر',
      'home.rate.t': 'به اقامت خود امتیاز دهید', 'home.rate.d': 'دو دقیقه، بدون نام',
      'home.services': 'خدمات هتل', 'home.nearby': 'پیشنهادهای اطراف', 'seeAll': 'همه',
      'qa.room': 'سرویس اتاق', 'qa.house': 'نظافت', 'qa.wifi': 'وای‌فای', 'qa.late': 'تخلیهٔ دیرتر', 'qa.concierge': 'پذیرش', 'qa.spa': 'اسپا',
      'd.mystay': 'اقامت من', 'd.room': 'سرویس اتاق', 'd.wifi': 'وای‌فای', 'd.settings': 'تنظیمات', 'd.lang': 'زبان', 'd.langLocked': 'تا پایان نظرسنجی قابل تغییر نیست', 'd.soon': 'به‌زودی',
      'lang.en': 'English', 'lang.fa': 'فارسی',
      'n.search': 'جست‌وجوی رستوران، کافه، دیدنی‌ها…', 'n.all': 'همه', 'n.restaurant': 'رستوران‌ها', 'n.cafe': 'کافه‌ها', 'n.poi': 'دیدنی‌ها',
      'n.open': 'اکنون باز', 'n.sort.dist': 'نزدیک‌ترین', 'n.sort.rating': 'بهترین امتیاز', 'n.results': '%1 مکان', 'n.empty.t': 'مکانی پیدا نشد', 'n.empty.d': 'واژهٔ دیگری را امتحان کنید یا فیلترها را پاک کنید.',
      'n.clear': 'پاک کردن فیلترها', 'n.isOpen': 'باز', 'n.isClosed': 'بسته', 'n.min': '%1 دقیقه پیاده', 'n.hours': 'ساعت کار', 'n.dir': 'مسیر', 'n.call': 'تماس', 'n.save': 'ذخیره', 'n.demo': 'دادهٔ نمایشی',
      'n.m': '%1 متر', 'n.km': '%1 کیلومتر', 'n.24h': 'شبانه‌روزی', 'n.sheet': 'جزئیات مکان',
      's.welcome.t': 'تجربهٔ شما برای ما ارزشمند است', 's.welcome.d': 'خوشحال می‌شویم اگر دو دقیقه وقت بگذارید و تجربهٔ خود را با ما در میان بگذارید.',
      's.time': 'حدود ۲ دقیقه', 's.anon': 'بدون نام', 's.q9': '۹ پرسش', 's.langNote': 'پس از شروع، نظرسنجی به فارسی می‌ماند.',
      's.start': 'شروع نظرسنجی', 's.step': 'پرسش %1 از %2', 's.back': 'قبلی', 's.next': 'ادامه', 's.submit': 'ارسال',
      's.req': 'الزامی', 's.opt': 'اختیاری', 's.err': 'لطفاً برای ادامه یک گزینه را انتخاب کنید.', 's.placeholder': 'هر قدر که می‌خواهید بنویسید',
      's.e15.lo': 'بسیار ضعیف', 's.e15.hi': 'عالی', 's.e010.lo': 'اصلاً احتمال ندارد', 's.e010.hi': 'به احتمال بسیار زیاد',
      's.done.t': 'سپاسگزاریم', 's.done.d': 'از اینکه وقت گذاشتید و تجربهٔ خود را با ما در میان گذاشتید سپاسگزاریم. نظر شما به ما کمک می‌کند هر اقامت را ویژه‌تر کنیم.',
      's.done.home': 'بازگشت به خانه', 's.done.nearby': 'گشتی در اطراف',
      'db.view': 'نمای مدیریت (نمایشی)', 'db.7': '۷ روز', 'db.30': '۳۰ روز', 'db.all': 'همه', 'db.total': 'پاسخ‌ها', 'db.avg': 'اقامت کلی', 'db.nps': 'NPS',
      'db.cats': 'رضایت به تفکیک بخش', 'db.n': 'n = %1', 'db.lang': 'زبان نظرسنجی', 'db.low': 'نمونه کم است (%1 پاسخ). این اعداد را با احتیاط بخوانید.',
      'db.updated': 'به‌روزرسانی %1', 'db.npsHelp': 'مروجان (۹–۱۰) منهای منتقدان (۰–۶)', 'db.det': 'منتقدان', 'db.pas': 'خنثی', 'db.pro': 'مروجان', 'db.none': 'در این بازه پاسخی ثبت نشده است.',
      'db.privacy': 'فقط آمار کلی. نظرهای نوشتاری مهمانان اینجا نمایش داده نمی‌شود.',
      'db.unavailable': 'دادهٔ داشبورد هنوز آماده نیست. فرایند به‌روزرسانی را اجرا کنید و چند لحظه صبر کنید.',
      'db.stale': 'از %1 به‌روزرسانی نشده است. آیا فرایند به‌روزرسانی در حال اجراست؟',
      'db.cat.overall': 'اقامت کلی', 'db.cat.cleanliness': 'تمیزی اتاق', 'db.cat.comfort': 'راحتی اتاق', 'db.cat.staff': 'کارکنان', 'db.cat.breakfast': 'صبحانه', 'db.cat.facilities': 'امکانات'
    }
  };

  // t(key, ...args): %1, %2 are replaced. A missing key returns the key itself (never the other language).
  function t(key) {
    var lang = (document.documentElement.lang === 'fa') ? 'fa' : 'en';
    var v = Object.prototype.hasOwnProperty.call(S[lang], key) ? S[lang][key] : key;
    for (var i = 1; i < arguments.length; i++) {
      v = v.split('%' + i).join(String(arguments[i]));
    }
    return v;
  }

  // num(x, decimals): locale digits (R-13).
  function num(x, decimals) {
    var d = decimals || 0;
    var locale = (document.documentElement.lang === 'fa') ? 'fa-IR' : 'en-US';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
  }

  // fold(s): search key (R-11). Accents removed, Arabic letter variants unified, ZWNJ and tatweel removed.
  function fold(s) {
    return String(s)
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/‌/g, '')
      .replace(/ـ/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  window.HotelI18n = { S: S, t: t, num: num, fold: fold };
})();
