import requests
import sys
import json
import base64
from datetime import datetime
from typing import Dict, Any

class CarplogAPITester:
    def __init__(self, base_url="https://angler-diary-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_catches = []  # Store created catches for cleanup

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[Any, Any] = None, params: Dict[str, Any] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return self.log_test(name, False, f"Unsupported method: {method}"), {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            details = f"Status: {response.status_code}"
            if not success:
                details += f" (Expected: {expected_status})"
                if response.text:
                    details += f" Response: {response.text[:200]}"

            return self.log_test(name, success, details), response_data

        except Exception as e:
            return self.log_test(name, False, f"Error: {str(e)}"), {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_create_catch(self, catch_data: Dict[str, Any]):
        """Test creating a new catch"""
        success, response = self.run_test("Create Catch", "POST", "catches", 201, catch_data)
        if success and 'id' in response:
            self.test_catches.append(response['id'])
            print(f"   Created catch with ID: {response['id']}")
        return success, response

    def test_get_catches(self):
        """Test getting all catches"""
        return self.run_test("Get All Catches", "GET", "catches", 200)

    def test_get_catches_with_filters(self, year: int, month: int = None):
        """Test getting catches with year/month filters"""
        params = {"year": year}
        if month:
            params["month"] = month
        
        test_name = f"Get Catches (Year: {year}" + (f", Month: {month}" if month else "") + ")"
        return self.run_test(test_name, "GET", "catches", 200, params=params)

    def test_delete_catch(self, catch_id: str):
        """Test deleting a catch"""
        success, response = self.run_test(f"Delete Catch ({catch_id[:8]}...)", "DELETE", f"catches/{catch_id}", 200)
        if success and catch_id in self.test_catches:
            self.test_catches.remove(catch_id)
        return success, response

    def test_monthly_stats(self, year: int):
        """Test getting monthly statistics"""
        return self.run_test(f"Monthly Stats ({year})", "GET", f"stats/monthly?year={year}", 200)

    def test_yearly_stats(self):
        """Test getting yearly statistics"""
        return self.run_test("Yearly Stats", "GET", "stats/yearly", 200)

    def create_sample_photo_base64(self):
        """Create a small sample image as base64"""
        # Create a minimal 1x1 pixel PNG image
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        return f"data:image/png;base64,{base64.b64encode(png_data).decode()}"

    def run_comprehensive_tests(self):
        """Run all API tests"""
        print("🎣 Starting Carplog-Pro API Tests")
        print("=" * 50)

        # Test 1: API Root
        self.test_api_root()

        # Test 2: Get initial catches (should work even if empty)
        success, initial_catches = self.test_get_catches()
        initial_count = len(initial_catches) if success and isinstance(initial_catches, list) else 0
        print(f"   Initial catches count: {initial_count}")

        # Test 3: Create test catches
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        test_catches_data = [
            {
                "fish_name": "Test Carp 1",
                "weight": 12.5,
                "peg_number": "A1",
                "wraps_count": 3,
                "bait_used": "Boilies",
                "notes": "Great fight!",
                "photo_base64": self.create_sample_photo_base64()
            },
            {
                "fish_name": "Test Carp 2", 
                "weight": 8.2,
                "peg_number": "B2",
                "wraps_count": 2,
                "bait_used": "Corn",
                "notes": "Quick catch"
            },
            {
                "fish_name": "Big One",
                "weight": 18.7,
                "peg_number": "C3",
                "wraps_count": 5,
                "bait_used": "Pellets",
                "notes": "Personal best!"
            }
        ]

        created_catches = []
        for i, catch_data in enumerate(test_catches_data):
            success, response = self.test_create_catch(catch_data)
            if success:
                created_catches.append(response)

        # Test 4: Get catches after creation
        success, updated_catches = self.test_get_catches()
        if success:
            new_count = len(updated_catches) if isinstance(updated_catches, list) else 0
            print(f"   Catches after creation: {new_count}")

        # Test 5: Test filtering by current year and month
        self.test_get_catches_with_filters(current_year)
        self.test_get_catches_with_filters(current_year, current_month)

        # Test 6: Test statistics endpoints
        self.test_monthly_stats(current_year)
        self.test_yearly_stats()

        # Test 7: Test delete functionality
        if self.test_catches:
            # Delete the first test catch
            first_catch_id = self.test_catches[0]
            self.test_delete_catch(first_catch_id)
            
            # Verify it's deleted by getting catches again
            success, final_catches = self.test_get_catches()
            if success:
                final_count = len(final_catches) if isinstance(final_catches, list) else 0
                print(f"   Catches after deletion: {final_count}")

        # Test 8: Test error cases
        print("\n🔍 Testing Error Cases:")
        
        # Test deleting non-existent catch
        self.run_test("Delete Non-existent Catch", "DELETE", "catches/non-existent-id", 404)
        
        # Test invalid catch creation (missing required fields)
        invalid_catch = {"fish_name": "Invalid"}  # Missing weight and peg_number
        self.run_test("Create Invalid Catch", "POST", "catches", 422, invalid_catch)

        # Cleanup remaining test catches
        print(f"\n🧹 Cleaning up {len(self.test_catches)} remaining test catches...")
        for catch_id in self.test_catches.copy():
            self.test_delete_catch(catch_id)

        # Final results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests mostly successful!")
            return True
        else:
            print("⚠️  Backend API has significant issues!")
            return False

def main():
    """Main test runner"""
    tester = CarplogAPITester()
    success = tester.run_comprehensive_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())