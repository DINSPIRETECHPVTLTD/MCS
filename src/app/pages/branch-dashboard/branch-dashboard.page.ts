import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';

export interface MemberDetail {
  memberId: string;
  memberName: string;
  weeklyDue: number;
}

export interface POCData {
  pocName: string;
  centerName: string;
  memberCount: number;
  totalAmount: number;
  members: MemberDetail[];
  expanded?: boolean;
}

@Component({
  selector: 'app-branch-dashboard',
  templateUrl: './branch-dashboard.page.html',
  styleUrls: ['./branch-dashboard.page.scss']
})
export class BranchDashboardComponent implements OnInit, ViewWillEnter {
  activeMenu: string = 'Dashboard';
  isStaff: boolean = false;
  pocsData: POCData[] = [];
  pocsDataTomorrow: POCData[] = [];
  selectedDate: 'today' | 'tomorrow' = 'today';
  todayDate: string = '';
  tomorrowDate: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private userContext: UserContextService
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Set dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.todayDate = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    this.tomorrowDate = tomorrow.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Check if user is staff
    this.isStaff = this.userContext.role?.toLowerCase() === 'staff';
    
    if (this.isStaff) {
      this.activeMenu = 'My View';
      this.loadPOCsData();
    }
  }

  ionViewWillEnter(): void {
    // Reload data when page becomes active
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    if (this.isStaff) {
      this.loadPOCsData();
    }
  }

  loadPOCsData(): void {
    // TODO: Replace with actual API call
    // For now, using dummy data for today
    this.pocsData = [
      {
        pocName: 'Shabana Zeeshan',
        centerName: 'Fatima Nagar',
        memberCount: 11,
        totalAmount: 8800.00,
        members: [
          { memberId: 'MMM001', memberName: 'Amina Begum', weeklyDue: 800.00 },
          { memberId: 'MMM002', memberName: 'Fatima Khan', weeklyDue: 800.00 },
          { memberId: 'MMM003', memberName: 'Zainab Ali', weeklyDue: 800.00 },
          { memberId: 'MMM004', memberName: 'Saira Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM005', memberName: 'Nazia Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM006', memberName: 'Rubina Khan', weeklyDue: 800.00 },
          { memberId: 'MMM007', memberName: 'Shabnam Begum', weeklyDue: 800.00 },
          { memberId: 'MMM008', memberName: 'Tasneem Ali', weeklyDue: 800.00 },
          { memberId: 'MMM009', memberName: 'Yasmin Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM010', memberName: 'Hina Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM011', memberName: 'Rukhsar Khan', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Zaiba Begum',
        centerName: 'Chintalmet Dimond hills',
        memberCount: 14,
        totalAmount: 11600.00,
        members: [
          { memberId: 'MMM012', memberName: 'Aisha Begum', weeklyDue: 800.00 },
          { memberId: 'MMM013', memberName: 'Bushra Khan', weeklyDue: 800.00 },
          { memberId: 'MMM014', memberName: 'Chanda Ali', weeklyDue: 800.00 },
          { memberId: 'MMM015', memberName: 'Dilshad Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM016', memberName: 'Esha Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM017', memberName: 'Farah Khan', weeklyDue: 800.00 },
          { memberId: 'MMM018', memberName: 'Gulshan Begum', weeklyDue: 800.00 },
          { memberId: 'MMM019', memberName: 'Hafsa Ali', weeklyDue: 800.00 },
          { memberId: 'MMM020', memberName: 'Iram Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM021', memberName: 'Javeria Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM022', memberName: 'Kiran Khan', weeklyDue: 800.00 },
          { memberId: 'MMM023', memberName: 'Lubna Begum', weeklyDue: 800.00 },
          { memberId: 'MMM024', memberName: 'Mehwish Ali', weeklyDue: 800.00 },
          { memberId: 'MMM025', memberName: 'Nadia Ahmed', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Muntaz',
        centerName: 'Hasan Nagar Indiranagar',
        memberCount: 10,
        totalAmount: 8000.00,
        members: [
          { memberId: 'MMM026', memberName: 'Omaima Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM027', memberName: 'Parveen Khan', weeklyDue: 800.00 },
          { memberId: 'MMM028', memberName: 'Qudsia Begum', weeklyDue: 800.00 },
          { memberId: 'MMM029', memberName: 'Rashida Ali', weeklyDue: 800.00 },
          { memberId: 'MMM030', memberName: 'Sadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM031', memberName: 'Tahira Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM032', memberName: 'Uzma Khan', weeklyDue: 800.00 },
          { memberId: 'MMM033', memberName: 'Vasima Begum', weeklyDue: 800.00 },
          { memberId: 'MMM034', memberName: 'Wajiha Ali', weeklyDue: 800.00 },
          { memberId: 'MMM035', memberName: 'Zara Ahmed', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Hasina',
        centerName: 'Zoopark Kalapathra',
        memberCount: 10,
        totalAmount: 8000.00,
        members: [
          { memberId: 'MMM036', memberName: 'Aaliya Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM037', memberName: 'Bilqis Khan', weeklyDue: 800.00 },
          { memberId: 'MMM038', memberName: 'Chandni Begum', weeklyDue: 800.00 },
          { memberId: 'MMM039', memberName: 'Dua Ali', weeklyDue: 800.00 },
          { memberId: 'MMM040', memberName: 'Eman Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM041', memberName: 'Fiza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM042', memberName: 'Ghazala Khan', weeklyDue: 800.00 },
          { memberId: 'MMM043', memberName: 'Hoorain Begum', weeklyDue: 800.00 },
          { memberId: 'MMM044', memberName: 'Iqra Ali', weeklyDue: 800.00 },
          { memberId: 'MMM045', memberName: 'Jannat Ahmed', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Malati bai',
        centerName: 'Mangal Hat',
        memberCount: 10,
        totalAmount: 8000.00,
        members: [
          { memberId: 'MMM046', memberName: 'Kainat Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM047', memberName: 'Laila Khan', weeklyDue: 800.00 },
          { memberId: 'MMM048', memberName: 'Maryam Begum', weeklyDue: 800.00 },
          { memberId: 'MMM049', memberName: 'Noor Ali', weeklyDue: 800.00 },
          { memberId: 'MMM050', memberName: 'Omaima Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM051', memberName: 'Pakeeza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM052', memberName: 'Qirat Khan', weeklyDue: 800.00 },
          { memberId: 'MMM053', memberName: 'Rida Begum', weeklyDue: 800.00 },
          { memberId: 'MMM054', memberName: 'Saba Ali', weeklyDue: 800.00 },
          { memberId: 'MMM055', memberName: 'Tuba Ahmed', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Mumtaz begum',
        centerName: 'Kishan Bagh',
        memberCount: 23,
        totalAmount: 18400.00,
        members: [
          { memberId: 'MMM056', memberName: 'Urooj Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM057', memberName: 'Vania Khan', weeklyDue: 800.00 },
          { memberId: 'MMM058', memberName: 'Wania Begum', weeklyDue: 800.00 },
          { memberId: 'MMM059', memberName: 'Xara Ali', weeklyDue: 800.00 },
          { memberId: 'MMM060', memberName: 'Yasira Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM061', memberName: 'Zainab Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM062', memberName: 'Abeer Khan', weeklyDue: 800.00 },
          { memberId: 'MMM063', memberName: 'Bushra Begum', weeklyDue: 800.00 },
          { memberId: 'MMM064', memberName: 'Chahat Ali', weeklyDue: 800.00 },
          { memberId: 'MMM065', memberName: 'Dua Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM066', memberName: 'Eman Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM067', memberName: 'Fatima Khan', weeklyDue: 800.00 },
          { memberId: 'MMM068', memberName: 'Gulshan Begum', weeklyDue: 800.00 },
          { memberId: 'MMM069', memberName: 'Hafsa Ali', weeklyDue: 800.00 },
          { memberId: 'MMM070', memberName: 'Iram Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM071', memberName: 'Javeria Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM072', memberName: 'Kiran Khan', weeklyDue: 800.00 },
          { memberId: 'MMM073', memberName: 'Lubna Begum', weeklyDue: 800.00 },
          { memberId: 'MMM074', memberName: 'Mehwish Ali', weeklyDue: 800.00 },
          { memberId: 'MMM075', memberName: 'Nadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM076', memberName: 'Omaima Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM077', memberName: 'Parveen Khan', weeklyDue: 800.00 },
          { memberId: 'MMM078', memberName: 'Qudsia Begum', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Haleema Khatoon',
        centerName: 'Kishan Bagh',
        memberCount: 11,
        totalAmount: 8800.00,
        members: [
          { memberId: 'MMM079', memberName: 'Rashida Ali', weeklyDue: 800.00 },
          { memberId: 'MMM080', memberName: 'Sadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM081', memberName: 'Tahira Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM082', memberName: 'Uzma Khan', weeklyDue: 800.00 },
          { memberId: 'MMM083', memberName: 'Vasima Begum', weeklyDue: 800.00 },
          { memberId: 'MMM084', memberName: 'Wajiha Ali', weeklyDue: 800.00 },
          { memberId: 'MMM085', memberName: 'Zara Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM086', memberName: 'Aaliya Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM087', memberName: 'Bilqis Khan', weeklyDue: 800.00 },
          { memberId: 'MMM088', memberName: 'Chandni Begum', weeklyDue: 800.00 },
          { memberId: 'MMM089', memberName: 'Dua Ali', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Ayesha Begum',
        centerName: 'Mehdipatnam',
        memberCount: 15,
        totalAmount: 12000.00,
        members: [
          { memberId: 'MMM090', memberName: 'Eman Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM091', memberName: 'Fiza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM092', memberName: 'Ghazala Khan', weeklyDue: 800.00 },
          { memberId: 'MMM093', memberName: 'Hoorain Begum', weeklyDue: 800.00 },
          { memberId: 'MMM094', memberName: 'Iqra Ali', weeklyDue: 800.00 },
          { memberId: 'MMM095', memberName: 'Jannat Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM096', memberName: 'Kainat Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM097', memberName: 'Laila Khan', weeklyDue: 800.00 },
          { memberId: 'MMM098', memberName: 'Maryam Begum', weeklyDue: 800.00 },
          { memberId: 'MMM099', memberName: 'Noor Ali', weeklyDue: 800.00 },
          { memberId: 'MMM100', memberName: 'Omaima Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM101', memberName: 'Pakeeza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM102', memberName: 'Qirat Khan', weeklyDue: 800.00 },
          { memberId: 'MMM103', memberName: 'Rida Begum', weeklyDue: 800.00 },
          { memberId: 'MMM104', memberName: 'Saba Ali', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Fatima Khan',
        centerName: 'Banjara Hills',
        memberCount: 18,
        totalAmount: 14400.00,
        members: [
          { memberId: 'MMM105', memberName: 'Tuba Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM106', memberName: 'Urooj Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM107', memberName: 'Vania Khan', weeklyDue: 800.00 },
          { memberId: 'MMM108', memberName: 'Wania Begum', weeklyDue: 800.00 },
          { memberId: 'MMM109', memberName: 'Xara Ali', weeklyDue: 800.00 },
          { memberId: 'MMM110', memberName: 'Yasira Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM111', memberName: 'Zainab Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM112', memberName: 'Abeer Khan', weeklyDue: 800.00 },
          { memberId: 'MMM113', memberName: 'Bushra Begum', weeklyDue: 800.00 },
          { memberId: 'MMM114', memberName: 'Chahat Ali', weeklyDue: 800.00 },
          { memberId: 'MMM115', memberName: 'Dua Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM116', memberName: 'Eman Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM117', memberName: 'Fatima Khan', weeklyDue: 800.00 },
          { memberId: 'MMM118', memberName: 'Gulshan Begum', weeklyDue: 800.00 },
          { memberId: 'MMM119', memberName: 'Hafsa Ali', weeklyDue: 800.00 },
          { memberId: 'MMM120', memberName: 'Iram Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM121', memberName: 'Javeria Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM122', memberName: 'Kiran Khan', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Rehana Parveen',
        centerName: 'Malakpet',
        memberCount: 12,
        totalAmount: 9600.00,
        members: [
          { memberId: 'MMM123', memberName: 'Lubna Begum', weeklyDue: 800.00 },
          { memberId: 'MMM124', memberName: 'Mehwish Ali', weeklyDue: 800.00 },
          { memberId: 'MMM125', memberName: 'Nadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM126', memberName: 'Omaima Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM127', memberName: 'Parveen Khan', weeklyDue: 800.00 },
          { memberId: 'MMM128', memberName: 'Qudsia Begum', weeklyDue: 800.00 },
          { memberId: 'MMM129', memberName: 'Rashida Ali', weeklyDue: 800.00 },
          { memberId: 'MMM130', memberName: 'Sadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM131', memberName: 'Tahira Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM132', memberName: 'Uzma Khan', weeklyDue: 800.00 },
          { memberId: 'MMM133', memberName: 'Vasima Begum', weeklyDue: 800.00 },
          { memberId: 'MMM134', memberName: 'Wajiha Ali', weeklyDue: 800.00 }
        ],
        expanded: false
      }
    ];
  }

  togglePOCExpand(poc: POCData): void {
    poc.expanded = !poc.expanded;
  }

  loadPOCsDataTomorrow(): void {
    // TODO: Replace with actual API call for tomorrow's data
    // For now, using dummy data for tomorrow (slightly different values)
    this.pocsDataTomorrow = [
      {
        pocName: 'Shabana Zeeshan',
        centerName: 'Fatima Nagar',
        memberCount: 12,
        totalAmount: 9600.00,
        members: [
          { memberId: 'MMM135', memberName: 'Amina Begum', weeklyDue: 800.00 },
          { memberId: 'MMM136', memberName: 'Fatima Khan', weeklyDue: 800.00 },
          { memberId: 'MMM137', memberName: 'Zainab Ali', weeklyDue: 800.00 },
          { memberId: 'MMM138', memberName: 'Saira Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM139', memberName: 'Nazia Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM140', memberName: 'Rubina Khan', weeklyDue: 800.00 },
          { memberId: 'MMM141', memberName: 'Shabnam Begum', weeklyDue: 800.00 },
          { memberId: 'MMM142', memberName: 'Tasneem Ali', weeklyDue: 800.00 },
          { memberId: 'MMM143', memberName: 'Yasmin Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM144', memberName: 'Hina Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM145', memberName: 'Rukhsar Khan', weeklyDue: 800.00 },
          { memberId: 'MMM146', memberName: 'Ayesha Begum', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Zaiba Begum',
        centerName: 'Chintalmet Dimond hills',
        memberCount: 15,
        totalAmount: 12000.00,
        members: [
          { memberId: 'MMM147', memberName: 'Bushra Khan', weeklyDue: 800.00 },
          { memberId: 'MMM148', memberName: 'Chanda Ali', weeklyDue: 800.00 },
          { memberId: 'MMM149', memberName: 'Dilshad Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM150', memberName: 'Esha Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM151', memberName: 'Farah Khan', weeklyDue: 800.00 },
          { memberId: 'MMM152', memberName: 'Gulshan Begum', weeklyDue: 800.00 },
          { memberId: 'MMM153', memberName: 'Hafsa Ali', weeklyDue: 800.00 },
          { memberId: 'MMM154', memberName: 'Iram Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM155', memberName: 'Javeria Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM156', memberName: 'Kiran Khan', weeklyDue: 800.00 },
          { memberId: 'MMM157', memberName: 'Lubna Begum', weeklyDue: 800.00 },
          { memberId: 'MMM158', memberName: 'Mehwish Ali', weeklyDue: 800.00 },
          { memberId: 'MMM159', memberName: 'Nadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM160', memberName: 'Omaima Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM161', memberName: 'Parveen Khan', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Muntaz',
        centerName: 'Hasan Nagar Indiranagar',
        memberCount: 11,
        totalAmount: 8800.00,
        members: [
          { memberId: 'MMM162', memberName: 'Qudsia Begum', weeklyDue: 800.00 },
          { memberId: 'MMM163', memberName: 'Rashida Ali', weeklyDue: 800.00 },
          { memberId: 'MMM164', memberName: 'Sadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM165', memberName: 'Tahira Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM166', memberName: 'Uzma Khan', weeklyDue: 800.00 },
          { memberId: 'MMM167', memberName: 'Vasima Begum', weeklyDue: 800.00 },
          { memberId: 'MMM168', memberName: 'Wajiha Ali', weeklyDue: 800.00 },
          { memberId: 'MMM169', memberName: 'Zara Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM170', memberName: 'Aaliya Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM171', memberName: 'Bilqis Khan', weeklyDue: 800.00 },
          { memberId: 'MMM172', memberName: 'Chandni Begum', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Hasina',
        centerName: 'Zoopark Kalapathra',
        memberCount: 11,
        totalAmount: 8800.00,
        members: [
          { memberId: 'MMM173', memberName: 'Dua Ali', weeklyDue: 800.00 },
          { memberId: 'MMM174', memberName: 'Eman Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM175', memberName: 'Fiza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM176', memberName: 'Ghazala Khan', weeklyDue: 800.00 },
          { memberId: 'MMM177', memberName: 'Hoorain Begum', weeklyDue: 800.00 },
          { memberId: 'MMM178', memberName: 'Iqra Ali', weeklyDue: 800.00 },
          { memberId: 'MMM179', memberName: 'Jannat Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM180', memberName: 'Kainat Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM181', memberName: 'Laila Khan', weeklyDue: 800.00 },
          { memberId: 'MMM182', memberName: 'Maryam Begum', weeklyDue: 800.00 },
          { memberId: 'MMM183', memberName: 'Noor Ali', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Malati bai',
        centerName: 'Mangal Hat',
        memberCount: 11,
        totalAmount: 8800.00,
        members: [
          { memberId: 'MMM184', memberName: 'Omaima Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM185', memberName: 'Pakeeza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM186', memberName: 'Qirat Khan', weeklyDue: 800.00 },
          { memberId: 'MMM187', memberName: 'Rida Begum', weeklyDue: 800.00 },
          { memberId: 'MMM188', memberName: 'Saba Ali', weeklyDue: 800.00 },
          { memberId: 'MMM189', memberName: 'Tuba Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM190', memberName: 'Urooj Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM191', memberName: 'Vania Khan', weeklyDue: 800.00 },
          { memberId: 'MMM192', memberName: 'Wania Begum', weeklyDue: 800.00 },
          { memberId: 'MMM193', memberName: 'Xara Ali', weeklyDue: 800.00 },
          { memberId: 'MMM194', memberName: 'Yasira Ahmed', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Mumtaz begum',
        centerName: 'Kishan Bagh',
        memberCount: 24,
        totalAmount: 19200.00,
        members: [
          { memberId: 'MMM195', memberName: 'Zainab Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM196', memberName: 'Abeer Khan', weeklyDue: 800.00 },
          { memberId: 'MMM197', memberName: 'Bushra Begum', weeklyDue: 800.00 },
          { memberId: 'MMM198', memberName: 'Chahat Ali', weeklyDue: 800.00 },
          { memberId: 'MMM199', memberName: 'Dua Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM200', memberName: 'Eman Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM201', memberName: 'Fatima Khan', weeklyDue: 800.00 },
          { memberId: 'MMM202', memberName: 'Gulshan Begum', weeklyDue: 800.00 },
          { memberId: 'MMM203', memberName: 'Hafsa Ali', weeklyDue: 800.00 },
          { memberId: 'MMM204', memberName: 'Iram Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM205', memberName: 'Javeria Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM206', memberName: 'Kiran Khan', weeklyDue: 800.00 },
          { memberId: 'MMM207', memberName: 'Lubna Begum', weeklyDue: 800.00 },
          { memberId: 'MMM208', memberName: 'Mehwish Ali', weeklyDue: 800.00 },
          { memberId: 'MMM209', memberName: 'Nadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM210', memberName: 'Omaima Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM211', memberName: 'Parveen Khan', weeklyDue: 800.00 },
          { memberId: 'MMM212', memberName: 'Qudsia Begum', weeklyDue: 800.00 },
          { memberId: 'MMM213', memberName: 'Rashida Ali', weeklyDue: 800.00 },
          { memberId: 'MMM214', memberName: 'Sadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM215', memberName: 'Tahira Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM216', memberName: 'Uzma Khan', weeklyDue: 800.00 },
          { memberId: 'MMM217', memberName: 'Vasima Begum', weeklyDue: 800.00 },
          { memberId: 'MMM218', memberName: 'Wajiha Ali', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Haleema Khatoon',
        centerName: 'Kishan Bagh',
        memberCount: 12,
        totalAmount: 9600.00,
        members: [
          { memberId: 'MMM219', memberName: 'Zara Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM220', memberName: 'Aaliya Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM221', memberName: 'Bilqis Khan', weeklyDue: 800.00 },
          { memberId: 'MMM222', memberName: 'Chandni Begum', weeklyDue: 800.00 },
          { memberId: 'MMM223', memberName: 'Dua Ali', weeklyDue: 800.00 },
          { memberId: 'MMM224', memberName: 'Eman Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM225', memberName: 'Fiza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM226', memberName: 'Ghazala Khan', weeklyDue: 800.00 },
          { memberId: 'MMM227', memberName: 'Hoorain Begum', weeklyDue: 800.00 },
          { memberId: 'MMM228', memberName: 'Iqra Ali', weeklyDue: 800.00 },
          { memberId: 'MMM229', memberName: 'Jannat Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM230', memberName: 'Kainat Sheikh', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Ayesha Begum',
        centerName: 'Mehdipatnam',
        memberCount: 16,
        totalAmount: 12800.00,
        members: [
          { memberId: 'MMM231', memberName: 'Laila Khan', weeklyDue: 800.00 },
          { memberId: 'MMM232', memberName: 'Maryam Begum', weeklyDue: 800.00 },
          { memberId: 'MMM233', memberName: 'Noor Ali', weeklyDue: 800.00 },
          { memberId: 'MMM234', memberName: 'Omaima Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM235', memberName: 'Pakeeza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM236', memberName: 'Qirat Khan', weeklyDue: 800.00 },
          { memberId: 'MMM237', memberName: 'Rida Begum', weeklyDue: 800.00 },
          { memberId: 'MMM238', memberName: 'Saba Ali', weeklyDue: 800.00 },
          { memberId: 'MMM239', memberName: 'Tuba Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM240', memberName: 'Urooj Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM241', memberName: 'Vania Khan', weeklyDue: 800.00 },
          { memberId: 'MMM242', memberName: 'Wania Begum', weeklyDue: 800.00 },
          { memberId: 'MMM243', memberName: 'Xara Ali', weeklyDue: 800.00 },
          { memberId: 'MMM244', memberName: 'Yasira Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM245', memberName: 'Zainab Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM246', memberName: 'Abeer Khan', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Fatima Khan',
        centerName: 'Banjara Hills',
        memberCount: 19,
        totalAmount: 15200.00,
        members: [
          { memberId: 'MMM247', memberName: 'Bushra Begum', weeklyDue: 800.00 },
          { memberId: 'MMM248', memberName: 'Chahat Ali', weeklyDue: 800.00 },
          { memberId: 'MMM249', memberName: 'Dua Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM250', memberName: 'Eman Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM251', memberName: 'Fatima Khan', weeklyDue: 800.00 },
          { memberId: 'MMM252', memberName: 'Gulshan Begum', weeklyDue: 800.00 },
          { memberId: 'MMM253', memberName: 'Hafsa Ali', weeklyDue: 800.00 },
          { memberId: 'MMM254', memberName: 'Iram Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM255', memberName: 'Javeria Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM256', memberName: 'Kiran Khan', weeklyDue: 800.00 },
          { memberId: 'MMM257', memberName: 'Lubna Begum', weeklyDue: 800.00 },
          { memberId: 'MMM258', memberName: 'Mehwish Ali', weeklyDue: 800.00 },
          { memberId: 'MMM259', memberName: 'Nadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM260', memberName: 'Omaima Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM261', memberName: 'Parveen Khan', weeklyDue: 800.00 },
          { memberId: 'MMM262', memberName: 'Qudsia Begum', weeklyDue: 800.00 },
          { memberId: 'MMM263', memberName: 'Rashida Ali', weeklyDue: 800.00 },
          { memberId: 'MMM264', memberName: 'Sadia Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM265', memberName: 'Tahira Sheikh', weeklyDue: 800.00 }
        ],
        expanded: false
      },
      {
        pocName: 'Rehana Parveen',
        centerName: 'Malakpet',
        memberCount: 13,
        totalAmount: 10400.00,
        members: [
          { memberId: 'MMM266', memberName: 'Uzma Khan', weeklyDue: 800.00 },
          { memberId: 'MMM267', memberName: 'Vasima Begum', weeklyDue: 800.00 },
          { memberId: 'MMM268', memberName: 'Wajiha Ali', weeklyDue: 800.00 },
          { memberId: 'MMM269', memberName: 'Zara Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM270', memberName: 'Aaliya Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM271', memberName: 'Bilqis Khan', weeklyDue: 800.00 },
          { memberId: 'MMM272', memberName: 'Chandni Begum', weeklyDue: 800.00 },
          { memberId: 'MMM273', memberName: 'Dua Ali', weeklyDue: 800.00 },
          { memberId: 'MMM274', memberName: 'Eman Ahmed', weeklyDue: 800.00 },
          { memberId: 'MMM275', memberName: 'Fiza Sheikh', weeklyDue: 800.00 },
          { memberId: 'MMM276', memberName: 'Ghazala Khan', weeklyDue: 800.00 },
          { memberId: 'MMM277', memberName: 'Hoorain Begum', weeklyDue: 800.00 },
          { memberId: 'MMM278', memberName: 'Iqra Ali', weeklyDue: 800.00 }
        ],
        expanded: false
      }
    ];
  }

  getCurrentPOCsData(): POCData[] {
    return this.selectedDate === 'today' ? this.pocsData : this.pocsDataTomorrow;
  }

  getTotalMembers(): number {
    const data = this.getCurrentPOCsData();
    return data.reduce((sum, poc) => sum + poc.memberCount, 0);
  }

  getTotalAmount(): number {
    const data = this.getCurrentPOCsData();
    return data.reduce((sum, poc) => sum + poc.totalAmount, 0);
  }

  getTotalPOCs(): number {
    const data = this.getCurrentPOCsData();
    return data.length;
  }

  selectDate(date: 'today' | 'tomorrow'): void {
    this.selectedDate = date;
    if (date === 'tomorrow' && this.pocsDataTomorrow.length === 0) {
      this.loadPOCsDataTomorrow();
    }
  }

  onMenuChange(menu: string): void {
    this.activeMenu = menu;
  }

  onBranchChange(_branch: Branch): void {
    // Handle branch change if needed
  }
}

