#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import base64

class CarplogAPITester:
    def __init__(self, base_url="https://image-loader-fix-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f" - {error_data}"
                except:
                    details += f" - {response.text[:200]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def create_test_image_base64(self):
        """Create a small test image in base64 format"""
        # Create a minimal 1x1 pixel PNG in base64
        # This is a valid PNG image data
        png_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=="
        return f"data:image/png;base64,{png_data}"

    def test_basic_endpoints(self):
        """Test basic API endpoints"""
        print("\n🔍 Testing Basic API Endpoints...")
        
        # Test catches endpoint (GET)
        self.run_test("Get Catches", "GET", "catches", 200)
        
        # Test yearly stats
        current_year = datetime.now().year
        self.run_test("Get Yearly Stats", "GET", "stats/yearly", 200)
        
        # Test monthly stats
        self.run_test("Get Monthly Stats", "GET", f"stats/monthly?year={current_year}", 200)

    def test_catch_creation(self):
        """Test catch creation with and without photos"""
        print("\n🔍 Testing Catch Creation...")
        
        # Test basic catch creation (no photo)
        basic_catch = {
            "fish_name": "Test Carp",
            "weight": 15.5,
            "weight_unit": "kg",
            "length": 85.0,
            "venue": "Test Lake",
            "peg_number": "12",
            "wraps_count": 3,
            "bait_used": "Boilies",
            "notes": "Great fight!",
            "caught_at": datetime.now().isoformat()
        }
        
        success, response = self.run_test("Create Basic Catch", "POST", "catches", 201, basic_catch)
        basic_catch_id = response.get('id') if success else None
        
        # Test catch creation with photo
        photo_catch = {
            "fish_name": "Photo Test Carp",
            "weight": 12.3,
            "weight_unit": "kg",
            "venue": "Photo Test Lake",
            "photo_base64": self.create_test_image_base64(),
            "notes": "Testing photo upload",
            "caught_at": datetime.now().isoformat()
        }
        
        success, response = self.run_test("Create Catch with Photo", "POST", "catches", 201, photo_catch)
        photo_catch_id = response.get('id') if success else None
        
        return basic_catch_id, photo_catch_id

    def test_catch_retrieval(self, catch_ids):
        """Test catch retrieval"""
        print("\n🔍 Testing Catch Retrieval...")
        
        # Get all catches and verify our test catches are there
        success, response = self.run_test("Get All Catches", "GET", "catches", 200)
        
        if success and isinstance(response, list):
            catch_ids_found = [catch.get('id') for catch in response]
            
            for catch_id in catch_ids:
                if catch_id and catch_id in catch_ids_found:
                    self.log_test(f"Find Catch {catch_id[:8]}...", True)
                elif catch_id:
                    self.log_test(f"Find Catch {catch_id[:8]}...", False, "Catch not found in response")

    def test_catch_deletion(self, catch_ids):
        """Test catch deletion"""
        print("\n🔍 Testing Catch Deletion...")
        
        for catch_id in catch_ids:
            if catch_id:
                self.run_test(f"Delete Catch {catch_id[:8]}...", "DELETE", f"catches/{catch_id}", 200)

    def test_photo_handling(self):
        """Test photo handling specifically"""
        print("\n🔍 Testing Photo Handling...")
        
        # Test with different image formats
        test_cases = [
            {
                "name": "Small PNG Image",
                "photo": self.create_test_image_base64(),
                "should_work": True
            },
            {
                "name": "Large Base64 String",
                "photo": "data:image/jpeg;base64," + "A" * 10000,  # Large fake base64
                "should_work": True  # Backend should accept it
            }
        ]
        
        for case in test_cases:
            catch_data = {
                "fish_name": f"Photo Test - {case['name']}",
                "weight": 10.0,
                "photo_base64": case['photo'],
                "caught_at": datetime.now().isoformat()
            }
            
            expected_status = 201 if case['should_work'] else 400
            success, response = self.run_test(
                f"Photo Test - {case['name']}", 
                "POST", 
                "catches", 
                expected_status, 
                catch_data
            )
            
            # Clean up if successful
            if success and case['should_work']:
                catch_id = response.get('id')
                if catch_id:
                    self.run_test(f"Cleanup Photo Test {case['name']}", "DELETE", f"catches/{catch_id}", 200)

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Carplog-Pro API Tests...")
        print(f"🌐 Testing against: {self.base_url}")
        
        try:
            # Test basic endpoints
            self.test_basic_endpoints()
            
            # Test catch creation
            catch_ids = self.test_catch_creation()
            
            # Test catch retrieval
            self.test_catch_retrieval([id for id in catch_ids if id])
            
            # Test photo handling
            self.test_photo_handling()
            
            # Test catch deletion (cleanup)
            self.test_catch_deletion([id for id in catch_ids if id])
            
        except Exception as e:
            print(f"❌ Test suite failed with exception: {str(e)}")
            return False
        
        # Print summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    tester = CarplogAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())